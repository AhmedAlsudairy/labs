export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 container flex flex-col gap-12 items-start mx-auto mt-9">
      {children}
    </div>
  );
}
