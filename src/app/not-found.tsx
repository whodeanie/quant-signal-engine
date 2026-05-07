import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-20 text-center space-y-4">
      <h1 className="text-3xl font-bold">Not found</h1>
      <p className="muted">The page you were looking for is not here.</p>
      <Link href="/" className="btn-primary inline-flex">
        Back to home
      </Link>
    </div>
  );
}
