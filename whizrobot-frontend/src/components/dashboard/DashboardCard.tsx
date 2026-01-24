import Link from "next/link";

export type DashboardCardProps = {
  title: string;
  description: string;
  href?: string;
};

export default function DashboardCard({
  title,
  description,
  href,
}: DashboardCardProps) {
  const content = (
    <div className="rounded-xl border border-gray-200 p-5 hover:shadow-md transition bg-white">
      <h3 className="text-lg font-semibold mb-1 text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
