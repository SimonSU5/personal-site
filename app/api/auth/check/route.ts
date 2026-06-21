import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin-session");

  if (session?.value === "true") {
    return Response.json({ authenticated: true });
  }

  return Response.json({ authenticated: false }, { status: 401 });
}
