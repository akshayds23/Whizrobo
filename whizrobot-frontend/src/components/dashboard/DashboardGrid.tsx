import DashboardCard from "./DashboardCard";

type Card = {
  title: string;
  description: string;
  href?: string;
};

type Props = {
  cards: Card[];
};

export default function DashboardGrid({ cards }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {cards.map((card) => (
        <DashboardCard
          key={`${card.title}-${card.href ?? "card"}`}
          title={card.title}
          description={card.description}
          href={card.href}
        />
      ))}
    </div>
  );
}
