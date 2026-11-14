import { Nav } from "@/components/nav";

// Every page behind the login. The nav lives here so it stays in place while
// the next page loads.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
