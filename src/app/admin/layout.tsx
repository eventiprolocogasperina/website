export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: 0 }}>
      {children}
    </div>
  );
}
