import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        items: [
          {
            title: "Dashboard",
            url: "/",
          },
        ],
      },
      {
        title: "User Management",
        icon: Icons.User,
        items: [
          {
            title: "User",
            url: "/",
          },
          {
            title: "Roles",
            url: "/",
          },
        ],
      },
      {
        title: "Complaint / Appeal",
        url: "/cases",
        icon: Icons.Calendar,
        items: [],
      },
      {
        title: "Transfers",
        url: "/profile",
        icon: Icons.User,
        items: [],
      },
      {
        title: " Office",
        url: "/forms",
        icon: Icons.Alphabet,
        items: [],
      },
      {
        title: "My Assigned Cases",
        url: "/tables",
        icon: Icons.Table,
        items: [],
      },
      {
        title: "Announcements",
        icon: Icons.Alphabet,
        items: [],
      },
      {
        title: "Help & Guidelines",
        icon: Icons.Alphabet,
        items: [],
      },
    ],
  },

];
