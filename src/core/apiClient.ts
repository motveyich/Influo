import { supabase } from './supabase';

export interface ApiError {
  message: string;
  status?: number;
  name: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

class ApiClient {
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        return {
          data: null,
          error: {
            message: 'Unauthorized',
            status: 401,
            name: 'UnauthorizedError',
          },
        };
      }

      const response = await this.parseEndpoint(endpoint, 'GET');
      return response as ApiResponse<T>;
    } catch (error) {
      console.error('API GET error:', error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: 'ApiError',
        },
      };
    }
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        return {
          data: null,
          error: {
            message: 'Unauthorized',
            status: 401,
            name: 'UnauthorizedError',
          },
        };
      }

      const response = await this.parseEndpoint(endpoint, 'POST', body);
      return response as ApiResponse<T>;
    } catch (error) {
      console.error('API POST error:', error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: 'ApiError',
        },
      };
    }
  }

  async patch<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        return {
          data: null,
          error: {
            message: 'Unauthorized',
            status: 401,
            name: 'UnauthorizedError',
          },
        };
      }

      const response = await this.parseEndpoint(endpoint, 'PATCH', body);
      return response as ApiResponse<T>;
    } catch (error) {
      console.error('API PATCH error:', error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: 'ApiError',
        },
      };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        return {
          data: null,
          error: {
            message: 'Unauthorized',
            status: 401,
            name: 'UnauthorizedError',
          },
        };
      }

      const response = await this.parseEndpoint(endpoint, 'DELETE');
      return response as ApiResponse<T>;
    } catch (error) {
      console.error('API DELETE error:', error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: 'ApiError',
        },
      };
    }
  }

  async uploadFile<T>(endpoint: string, file: File): Promise<ApiResponse<T>> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        return {
          data: null,
          error: {
            message: 'Unauthorized',
            status: 401,
            name: 'UnauthorizedError',
          },
        };
      }

      const matches = endpoint.match(/\/profiles\/([^/]+)\/avatar/);
      if (!matches || !matches[1]) {
        return {
          data: null,
          error: {
            message: 'Invalid endpoint format',
            name: 'ValidationError',
          },
        };
      }

      const userId = matches[1];
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        return {
          data: null,
          error: {
            message: uploadError.message,
            name: 'UploadError',
          },
        };
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return {
        data: { avatarUrl: publicUrlData.publicUrl } as T,
        error: null,
      };
    } catch (error) {
      console.error('API uploadFile error:', error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: 'ApiError',
        },
      };
    }
  }

  private async parseEndpoint(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: any
  ): Promise<ApiResponse<any>> {
    const profilesMatch = endpoint.match(/^\/profiles(?:\/([^/?]+))?(?:\/([^/?]+))?(?:\?(.*))?$/);

    if (profilesMatch) {
      const userId = profilesMatch[1];
      const action = profilesMatch[2];
      const queryString = profilesMatch[3];

      if (!userId && method === 'GET') {
        const params = new URLSearchParams(queryString || '');
        const query = params.get('q') || '';
        const userType = params.get('userType');
        const limit = parseInt(params.get('limit') || '10');

        let dbQuery = supabase
          .from('user_profiles')
          .select('*');

        if (query) {
          dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,bio.ilike.%${query}%`);
        }

        if (userType) {
          dbQuery = dbQuery.eq('user_type', userType);
        }

        dbQuery = dbQuery.limit(limit);

        const { data, error } = await dbQuery;

        if (error) {
          return {
            data: null,
            error: {
              message: error.message,
              name: 'DatabaseError',
            },
          };
        }

        return { data, error: null };
      }

      if (userId && !action && method === 'GET') {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          return {
            data: null,
            error: {
              message: error.message,
              status: 404,
              name: 'NotFoundError',
            },
          };
        }

        return { data, error: null };
      }

      if (userId && !action && method === 'PATCH') {
        const { data, error } = await supabase
          .from('user_profiles')
          .update(body)
          .eq('user_id', userId)
          .select()
          .maybeSingle();

        if (error) {
          return {
            data: null,
            error: {
              message: error.message,
              name: 'UpdateError',
            },
          };
        }

        return { data, error: null };
      }

      if (userId && action === 'completion' && method === 'GET') {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('full_name, email, phone, location, bio, influencer_data, advertiser_data')
          .eq('user_id', userId)
          .maybeSingle();

        if (error || !data) {
          return {
            data: {
              basicInfo: false,
              influencerSetup: false,
              advertiserSetup: false,
              overallComplete: false,
              completionPercentage: 0,
            },
            error: null,
          };
        }

        const basicInfo = !!(
          data.full_name?.trim() &&
          data.email?.trim() &&
          data.phone?.trim() &&
          data.location?.trim() &&
          data.bio?.trim() &&
          data.bio.trim().length >= 50
        );

        const influencerSetup = !!(data.influencer_data && Object.keys(data.influencer_data).length > 0);
        const advertiserSetup = !!(data.advertiser_data && Object.keys(data.advertiser_data).length > 0);

        let completionPercentage = 0;
        if (basicInfo) completionPercentage += 50;
        if (influencerSetup) completionPercentage += 25;
        if (advertiserSetup) completionPercentage += 25;

        const overallComplete = basicInfo && (influencerSetup || advertiserSetup);

        return {
          data: {
            basicInfo,
            influencerSetup,
            advertiserSetup,
            overallComplete,
            completionPercentage,
          },
          error: null,
        };
      }
    }

    return {
      data: null,
      error: {
        message: 'Endpoint not implemented',
        status: 501,
        name: 'NotImplementedError',
      },
    };
  }
}

export const apiClient = new ApiClient();
