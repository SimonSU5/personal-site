import { StyleProvider } from "@/lib/contexts/StyleContext";

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StyleProvider>
      {children}
    </StyleProvider>
  );
}
