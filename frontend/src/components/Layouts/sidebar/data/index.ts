import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        allowedRoles: [
          // "Citizen",
          "Focal Person - Kebele",
          "Focal Person - Wereda",
          "Focal Person - Sector",
          "Director",
          "President Office",
          "President",
        ],
        items: [
          {
            title: "Dashboard",
            url: "/dashboard",
          },
        ],
      },
      {
        title: "User Management",
        icon: Icons.User,
        allowedRoles: [
          "Focal Person - Kebele",
          "Focal Person - Wereda",
          "Focal Person - Sector",
          "Director",
          "President Office",
          "President",
        ],
        items: [
          { title: "User", url: "/users",
            allowedRoles: [
              "Focal Person - Kebele",
              "Focal Person - Wereda",
              "Focal Person - Sector",
              "Director",
              "President Office",
              "President",
            ],
          },
          { title: "Role", url: "/roles",
            allowedRoles: [
              "Director",
              "President Office",
              "President",
            ], 
          },
          { title: "Office", url: "/offices",
            allowedRoles: [
              "Director",
              "President Office",
              "President",
            ], 
          },
        ],
      },
      {
        title: "Complaint / Appeal",
        url: "/cases",
        icon: Icons.Calendar,
        allowedRoles: [
          "Citizen",
          "Focal Person - Kebele",
          "Focal Person - Wereda",
          "Focal Person - Sector",
        ],
        items: [],
      },
      {
        title: "Transfers",
        url: "/profile",
        icon: Icons.User,
        allowedRoles: [
          "Focal Person - Kebele",
          "Focal Person - Wereda",
          "Focal Person - Sector",
          "Director",
          "President Office",
          "President",
        ],
        items: [],
      },
      {
        title: " Office Stats",
        url: "/forms",
        icon: Icons.Alphabet,
        allowedRoles: ["Director", "President Office", "President"],
        items: [],
      },
      {
        title: "My Assigned Cases",
        url: "/tables",
        icon: Icons.Table,
        allowedRoles: [
          "Focal Person - Kebele",
          "Focal Person - Wereda",
          "Focal Person - Sector",
          "Director",
          "President Office",
          "President",
        ],
        items: [],
      },
      {
        title: "Announcements",
        icon: Icons.Alphabet,
        allowedRoles: [
          "Citizen",
          "Focal Person - Kebele",
          "Focal Person - Wereda",
          "Focal Person - Sector",
          "Director",
          "President Office",
          "President",
        ],
        items: [],
      },
      {
        title: "Help & Guidelines",
        icon: Icons.Alphabet,
        allowedRoles: [
          "Citizen",
          "Focal Person - Kebele",
          "Focal Person - Wereda",
          "Focal Person - Sector",
          "Director",
          "President Office",
          "President",
        ],
        items: [],
      },
    ],
  },

];
