import { checkAuth } from "@/lib/auth";

export async function GET() {
  const authenticated = await checkAuth();

  if (authenticated) {
    return Response.json({ authenticated: true });
  }

  return Response.json({ authenticated: false }, { status: 401 });
}
