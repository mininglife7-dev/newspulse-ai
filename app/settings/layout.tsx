export const revalidate = 0; // Never cache settings pages (user-specific and sensitive)

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
