import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL as string,
      (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY) as string,
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
