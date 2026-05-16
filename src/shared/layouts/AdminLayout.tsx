import type { ReactNode } from "react";

type Props = { children: ReactNode };

/** Sidebar navigation + main content for the superadmin dashboard. */
export default function AdminLayout({ children }: Props) {
  return <div>{children}</div>;
}
