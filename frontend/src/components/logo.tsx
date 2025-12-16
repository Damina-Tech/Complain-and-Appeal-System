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
      <div className="flex items-center gap-1.5">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-sm">CAS</span>
        </div>
        <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent dark:from-primary dark:to-primary/80">
          Chiro City CAS
        </span>
      </div>
    </div>
  );
}