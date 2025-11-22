declare module 'https://esm.sh/@supabase/supabase-js@2.81.1' {
  export function createClient(url: string, key: string, options?: any): any;
}

declare namespace Deno {
  export function env(key: string): string | undefined;
  export namespace env {
    function get(key: string): string | undefined;
  }
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}
