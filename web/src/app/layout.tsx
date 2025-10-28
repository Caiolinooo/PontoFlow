// This root layout is required by Next.js but the [locale] layout handles the html/body setup
// Since we're using i18n with [locale] segment, this layout just passes through children
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
