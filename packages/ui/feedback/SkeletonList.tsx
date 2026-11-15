import { Skeleton } from './Skeleton';
import { SkeletonLoanOrCustomerCard } from './SkeletonCard';

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLoanOrCustomerCard key={index} />
      ))}
    </div>
  );
}

export function SkeletonDataTable({
  headers,
  rows = 6,
}: {
  headers: string[];
  rows?: number;
}) {
  return (
    <div
      aria-busy="true"
      className="overflow-hidden rounded-xl border border-[#DCE3DF] bg-white dark:border-[#1E3329] dark:bg-[#0F1E17]"
    >
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#DCE3DF] bg-[#F7FAF8] dark:border-[#1E3329] dark:bg-[#13261D]">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-xs font-semibold text-[#54665C] dark:text-[#96ACA0] whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-[#EDF2EF] last:border-b-0 dark:border-[#192D23]"
            >
              {headers.map((header, colIdx) => (
                <td key={header} className="px-4 py-3.5">
                  <Skeleton
                    width={colIdx === 0 ? '72%' : colIdx === headers.length - 1 ? 76 : '58%'}
                    height={14}
                    rounded="sm"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonFooterMore() {
  return (
    <div className="mt-3 flex flex-col gap-3" aria-busy="true">
      <SkeletonLoanOrCustomerCard />
      <SkeletonLoanOrCustomerCard />
    </div>
  );
}
