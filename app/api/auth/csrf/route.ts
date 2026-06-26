import { getCsrfToken } from "@/lib/csrf";

export async function GET() {
  const token = await getCsrfToken();
  return Response.json({ csrfToken: token });
}
