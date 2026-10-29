import { getWorkspaceData } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workspace = await getWorkspaceData();
    return Response.json(workspace);
  } catch (error) {
    console.error("Falha ao carregar o workspace:", error);
    return Response.json({ error: "Não foi possível carregar os dados da loja." }, { status: 500 });
  }
}
