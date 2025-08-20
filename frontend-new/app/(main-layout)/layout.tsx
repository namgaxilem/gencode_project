import MainLayout from "./_views/MainLayout";

export default function Layout({ children }) {
  return (
    <div>
      <MainLayout>{children}</MainLayout>
    </div>
  );
}
