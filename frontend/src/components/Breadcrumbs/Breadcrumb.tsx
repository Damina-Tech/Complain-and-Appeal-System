import Link from "next/link";

interface BreadcrumbProps {
  pageName: string;
}

const Breadcrumb = ({ pageName }: BreadcrumbProps) => {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Main Page Title */}
      <h2 className="text-[26px] font-bold leading-[30px] text-dark dark:text-white"> {pageName} </h2>

      {/* Trail */}
      <nav>
        <ol className="flex items-center gap-2">
          <li>
            <Link className="font-medium" href="/">
              Dashboard /
            </Link>
          </li>
          <li className="font-medium text-[#5750f1]">{pageName}</li>
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;
