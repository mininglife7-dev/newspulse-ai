export const revalidate = 0; // Never cache auth pages (must be fresh)

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
