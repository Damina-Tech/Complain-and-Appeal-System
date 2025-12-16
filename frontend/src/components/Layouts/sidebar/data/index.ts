import { url } from "inspector";
import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        allowedRoles: [
          "Focal Person",
          "Director",
          "Mayor Office",
          "Admin",
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
          "Focal Person",
          "Director",
          "Mayor Office",
          "Admin",
        ],
        items: [
          { title: "User", url: "/users",
            allowedRoles: [
              "Focal Person",
              "Director",
              "Mayor Office",
              "Admin",
            ],
          },
          { title: "Role", url: "/roles",
            allowedRoles: [
              "Admin",
            ], 
          },
          { title: "Office", url: "/offices",
            allowedRoles: [
              "Director",
              "Mayor Office",
              "Admin",
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
          "Focal Person",
          "Director",
          "Mayor Office",
          "Admin",
        ],
        items: [],
      },
      {
        title: "Transfers",
        url: "/cases/activity",
        icon: Icons.ReferralAvatar,
        allowedRoles: [
          "Focal Person",
          "Director",
          "Mayor Office",
          "Admin",
        ],
        items: [],
      },
      {
        title: "My Assigned Cases",
        url: "/cases/my-assigned",
        icon: Icons.Table,
        allowedRoles: [
          "Focal Person",
          "Director",
          "Mayor Office",
          "Admin",
        ],
        items: [],
      },
      {
        title: "Feedback / Appeal",
        url: "/feedback-appeal",
        icon: Icons.MessageCircle,
        allowedRoles: [
          "Focal Person",
          "Director",
          "Admin",
        ],
        items: [],
      },
      {
        title: "Reports",
        url: "/reports",
        icon: Icons.ReportsAvatar,
        allowedRoles: ["Director", "Mayor Office", "Admin"],
        items: [],
      },
      {
        title: "Announcements",
        icon: Icons.AnnouncementsAvatar,
        allowedRoles: [
          "Citizen",
          "Focal Person",
          "Director",
          "Mayor Office",
          "Admin",
        ],
        items: [],
      },
      {
        title: "Help & Guidelines",
        url: "/help-guidelines",
        icon: Icons.Alphabet,
        allowedRoles: [
          "Citizen",
          "Focal Person",
          "Director",
          "Mayor Office",
          "Admin",
        ],
        items: [],
      },
      {
        title: "System Settings",
        url: "/settings",
        icon: Icons.Settings,
        allowedRoles: ["Admin"],
        items: [],
      },
    ],
  },

];
