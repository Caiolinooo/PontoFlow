export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages have their own full-page layout (no header, no main wrapper)
  return <>{children}</>;
}

