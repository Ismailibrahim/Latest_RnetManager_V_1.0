export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}

