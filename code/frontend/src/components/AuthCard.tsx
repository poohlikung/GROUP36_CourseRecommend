import { Link } from 'react-router-dom';

interface AuthCardProps {
  title: string;
  description: string;
  alternateText: string;
  alternateLinkText: string;
  alternateTo: string;
  children: React.ReactNode;
}

export function AuthCard({
  title,
  description,
  alternateText,
  alternateLinkText,
  alternateTo,
  children,
}: AuthCardProps) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl place-items-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">CourseHub</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-7">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-600">
          {alternateText}{' '}
          <Link to={alternateTo} className="font-semibold text-cyan-700 hover:underline">
            {alternateLinkText}
          </Link>
        </p>
      </section>
    </main>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-red-700">{message}</p> : null;
}
