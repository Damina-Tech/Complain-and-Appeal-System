import darkLogo from "@/assets/logos/dark.svg";
import logo from "@/assets/logos/main.svg";
import Image from "next/image";

// export function Logo() {
//   return (
//     <div className="relative h-8 max-w-[10.847rem]">
//       <Image
//         src={logo}
//         fill
//         className="dark:hidden"
//         alt="NextAdmin logo"
//         role="presentation"
//         quality={100}
//       />

//       <Image
//         src={darkLogo}
//         fill
//         className="hidden dark:block"
//         alt="NextAdmin logo"
//         role="presentation"
//         quality={100}
//       />
//     </div>
//   );
// }

export function Logo() {
  return (
    <div className="relative h-8 max-w-[12rem] flex items-center gap-2">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center shadow-lg ring-2 ring-primary/20">
          <span className="text-white font-bold text-sm">CAS</span>
        </div>
        <span className="font-bold text-xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent dark:from-primary dark:via-primary/90 dark:to-primary/80">
          Chiro City CAS
        </span>
      </div>
    </div>
  );
}