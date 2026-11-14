import { formatDate } from "@/lib/format";

// One day, or the first and last days of a longer event
export function EventDates({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string | null;
}) {
  if (!endDate || endDate === startDate) return <>{formatDate(startDate)}</>;
  return (
    <>
      {formatDate(startDate)} a {formatDate(endDate)}
    </>
  );
}
