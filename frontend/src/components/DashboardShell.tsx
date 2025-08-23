"use client";

import { usePathname } from "next/navigation";
import NextTopLoader from "nextjs-toploader";
import ProtectedWrapper from "./ProtectedWrapper";
import { Sidebar } from "./Layouts/sidebar";
import { Header } from "./Layouts/header";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isAuthRoute = pathname?.startsWith("/auth");
	const publicRoutes = new Set(["/", "/about", "/services", "/contact"]);
	const isPublicRoute = pathname ? publicRoutes.has(pathname) : false;

	if (isAuthRoute || isPublicRoute) {
		return <>{children}</>;
	}

	return (
		<ProtectedWrapper>
			<NextTopLoader color="#5750F1" showSpinner={false} />
			<div className="flex min-h-screen">
				<Sidebar />
				<div className="w-full bg-gray-2 dark:bg-[#020d1a]">
					<Header />
					<main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
						{children}
					</main>
				</div>
			</div>
		</ProtectedWrapper>
	);
}


