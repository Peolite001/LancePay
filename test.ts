export async function GET(request: any, { params }: any) {
  const a = (await params).id;
  const b = { id: (await params).id };
  return a + b;
}
