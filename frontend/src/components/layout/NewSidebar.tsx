import logo from "@/assets/logo-svg.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import {
  BlendIcon,
  ChevronRight,
  CircleDollarSign,
  ClipboardMinus,
  HandCoins,
  ReceiptText
} from "lucide-react";

import { messaging, VAPIDKEY } from "@/firebase/firebaseConfig";
import { NirmaanUsers } from "@/types/NirmaanStack/NirmaanUsers";
import {
  handlePOAmendedEvent,
  handlePONewEvent,
  handlePRApproveNewEvent,
  handlePRDeleteEvent,
  handlePRNewEvent,
  handlePRVendorSelectedEvent,
  handleSBNewEvent,
  handleSBVendorSelectedEvent,
  handleSOAmendedEvent,
  handleSRApprovedEvent,
  handleSRVendorSelectedEvent
} from "@/zustand/eventListeners";
import { useDocCountStore } from "@/zustand/useDocCountStore";
import { useNotificationStore } from "@/zustand/useNotificationStore";
import { getToken } from "firebase/messaging";
import {
  FrappeConfig,
  FrappeContext,
  useFrappeDocTypeEventListener,
  useFrappeEventListener,
  useFrappeGetDoc,
  useFrappeGetDocList,
  useFrappeUpdateDoc,
} from "frappe-react-sdk";
import Cookies from "js-cookie";
import {
  LayoutGrid,
  List,
  Shapes,
  ShoppingCart,
  SquareSquare
} from "lucide-react";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserNav } from "../nav/user-nav";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Separator } from "../ui/separator";

export function NewSidebar() {
  const [role, setRole] = useState<string | null>(null);
  const location = useLocation();

  const navigate = useNavigate();

  const user_id = Cookies.get("user_id") ?? "";

  const [collapsedKey, setCollapsedKey] = useState<string | null>(null); // Tracks the currently open group

  const handleGroupToggle = useCallback((key : string) => {
    setCollapsedKey((prevKey) => (prevKey === key ? null : key));
  }, [collapsedKey]);

  const { toggleSidebar, isMobile, state } = useSidebar();

  const { data } = useFrappeGetDoc<NirmaanUsers>(
    "Nirmaan Users",
    user_id,
    user_id === "Administrator" ? null : undefined
  );

  useEffect(() => {
    if (data) {
      setRole(data.role_profile);
    }
  }, [data]);


  const {
    updatePRCounts,
    updateSBCounts,
    updatePOCounts,
    updateSRCounts,
    updatePaymentsCount,
  } = useDocCountStore();

  const { add_new_notification, delete_notification, clear_notifications, add_all_notific_directly } =
    useNotificationStore();
  const { db } = useContext(FrappeContext) as FrappeConfig;

  // Fetch all notifications that are unseen for the current user
  const { data: notificationsData, mutate: notificationsDataMutate } = useFrappeGetDocList(
    "Nirmaan Notifications",
    {
      fields: ["name", "creation", "description", "docname", "document", "event_id", "project", "recipient", "recipient_role", "seen", "sender", "title", "type", "work_package", "action_url"],
      filters: [["recipient", "=", user_id]],
      limit: 500,
      orderBy: { field: "creation", order: "desc" },
    }
  );

  // On initial render, segregate notifications and store in Zustand
  useEffect(() => {
    if (notificationsData) {
      clear_notifications();
      // notificationsData.forEach((notification: any) => {
      //   add_new_notification({
      //     name: notification.name,
      //     creation: notification.creation,
      //     description: notification.description,
      //     docname: notification.docname,
      //     document: notification.document,
      //     event_id: notification.event_id,
      //     project: notification.project,
      //     recipient: notification.recipient,
      //     recipient_role: notification.recipient_role,
      //     seen: notification.seen,
      //     sender: notification?.sender,
      //     title: notification.title,
      //     type: notification.type,
      //     work_package: notification.work_package,
      //     action_url: notification?.action_url,
      //   });
      // });

      add_all_notific_directly(notificationsData)
    }
  }, [notificationsData, user_id]);

  const { updateDoc } = useFrappeUpdateDoc();

  const { data: projectPermissions } = useFrappeGetDocList(
    "Nirmaan User Permissions",
    {
      fields: ["for_value"],
      filters: [
        ["allow", "=", "Projects"],
        ["user", "=", user_id],
      ],
      limit: 1000,
    },
    user_id === "Administrator" || role === "Nirmaan Admin Profile"
      ? null
      : undefined
  );

  const permissionsList = projectPermissions?.map((i) => i?.for_value);

  const { data: poData, mutate: poDataMutate } = useFrappeGetDocList(
    "Procurement Orders",
    {
      fields: ["status"],
      filters: [["project", "in", permissionsList || []]],
      limit: 100000,
    },
    user_id === "Administrator" || !permissionsList ? null : undefined
  );

  const { data: adminPOData, mutate: adminPODataMutate } = useFrappeGetDocList(
    "Procurement Orders",
    {
      fields: ["status"],
      limit: 100000,
    },
    user_id === "Administrator" || role === "Nirmaan Admin Profile"
      ? undefined
      : null
  );

  const { data: prData, mutate: prDataMutate } = useFrappeGetDocList(
    "Procurement Requests",
    {
      fields: ["workflow_state", "procurement_list"],
      filters: [
        [
          "workflow_state",
          "in",
          [
            "Pending",
            "Vendor Selected",
            "Partially Approved",
            "Approved",
            "RFQ Generated",
            "Quote Updated",
            "In Progress",
          ],
        ],
        ["project", "in", permissionsList || []],
      ],
      limit: 100000,
    },
    user_id === "Administrator" || !permissionsList ? null : "prDataMutate"
  );

  const { data: adminPrData, mutate: adminPRDataMutate } = useFrappeGetDocList(
    "Procurement Requests",
    {
      fields: ["workflow_state", "procurement_list"],
      filters: [
        [
          "workflow_state",
          "in",
          [
            "Pending",
            "Vendor Selected",
            "Partially Approved",
            "Approved",
            "RFQ Generated",
            "Quote Updated",
            "In Progress",
          ],
        ],
      ],
      limit: 100000,
    },

    user_id === "Administrator" || role === "Nirmaan Admin Profile"
      ? "adminPRDataMutate"
      : null
  );

  const { data: sbData, mutate: sbDataMutate } = useFrappeGetDocList(
    "Sent Back Category",
    {
      fields: ["workflow_state", "item_list", "type"],
      filters: [
        [
          "workflow_state",
          "in",
          ["Vendor Selected", "Partially Approved", "Pending"],
        ],
        ["project", "in", permissionsList || []],
      ],
      limit: 10000,
    },
    user_id === "Administrator" || !permissionsList ? null : undefined
  );

  const { data: adminSBData, mutate: adminSBDataMutate } = useFrappeGetDocList(
    "Sent Back Category",
    {
      fields: ["workflow_state", "item_list", "type"],
      filters: [
        [
          "workflow_state",
          "in",
          ["Vendor Selected", "Partially Approved", "Pending"],
        ],
      ],
      limit: 10000,
    },
    user_id === "Administrator" || role === "Nirmaan Admin Profile"
      ? undefined
      : null
  );

  const { data: srData, mutate: srDataMutate } = useFrappeGetDocList(
    "Service Requests",
    {
      fields: ["status", "project", "vendor"],
      filters: [["project", "in", permissionsList || []]],
      limit: 10000,
    },
    user_id === "Administrator" || !permissionsList ? null : undefined
  );

  const { data: adminSRData, mutate: adminSRDataMutate } = useFrappeGetDocList(
    "Service Requests",
    {
      fields: ["status", "project", "vendor"],
      limit: 10000,
    },
    user_id === "Administrator" || role === "Nirmaan Admin Profile"
      ? undefined
      : null
  );

  const { data: paymentsData, mutate: paymentsDataMutate } = useFrappeGetDocList(
    "Project Payments",
    {
      fields: ["status", "project", "vendor", "name"],
      filters: [["project", "in", permissionsList || []]],
      limit: 100000,
    },
    user_id === "Administrator" || !permissionsList ? null : undefined
  );

  const { data: adminPaymentsData, mutate: adminPaymentsDataMutate } = useFrappeGetDocList(
    "Project Payments",
    {
      fields: ["status", "project", "vendor", "name"],
      limit: 100000,
    },
    user_id === "Administrator" || role === "Nirmaan Admin Profile"
      ? undefined
      : null
  );

  useEffect(() => {
    if (
      (user_id === "Administrator" || role === "Nirmaan Admin Profile") &&
      adminPOData
    ) {
      updatePOCounts(adminPOData, true);
    } else if (poData) {
      updatePOCounts(poData, false);
    }
  }, [poData, adminPOData]);

  useEffect(() => {
    if (
      (user_id === "Administrator" || role === "Nirmaan Admin Profile") &&
      adminSBData
    ) {
      updateSBCounts(adminSBData, true);
    } else if (sbData) {
      updateSBCounts(sbData, false);
    }
  }, [sbData, adminSBData]);

  useEffect(() => {
    if (
      (user_id === "Administrator" || role === "Nirmaan Admin Profile") &&
      adminPrData
    ) {
      updatePRCounts(adminPrData, true);
    } else if (prData) {
      updatePRCounts(prData, false);
    }
  }, [prData, adminPrData]);

  useEffect(() => {
    if (
      (user_id === "Administrator" || role === "Nirmaan Admin Profile") &&
      adminSRData
    ) {
      updateSRCounts(adminSRData, true);
    } else if (srData) {
      updateSRCounts(srData, false);
    }
  }, [srData, adminSRData]);

  useEffect(() => {
    if (
      (user_id === "Administrator" || role === "Nirmaan Admin Profile") &&
      adminPOData
    ) {
      updatePaymentsCount(adminPaymentsData, true);
    } else if (poData) {
      updatePaymentsCount(paymentsData, false);
    }
  }, [paymentsData, adminPaymentsData]);


  //  ***** PR Events *****
  useFrappeEventListener("pr:new", async (event) => {
    await handlePRNewEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("pr:delete", (event) => {
    handlePRDeleteEvent(event, delete_notification);
  });

  useFrappeEventListener("pr:vendorSelected", async (event) => {
    await handlePRVendorSelectedEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("pr:approved", async (event) => {
    await handlePRApproveNewEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("pr:rejected", async (event) => {
    await handlePRNewEvent(db, event, add_new_notification);
  });

  useFrappeDocTypeEventListener("Procurement Requests", async (event) => {
    if (role === "Nirmaan Admin Profile" || user_id === "Administrator") {
      await adminPRDataMutate();
    } else {
      await prDataMutate();
    }
  });

  useFrappeDocTypeEventListener("Nirmaan Notifications", async (event) => {
    await notificationsDataMutate();
  });

  //  ***** SB Events *****
  useFrappeEventListener("sb:vendorSelected", async (event) => {
    await handleSBVendorSelectedEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("Rejected-sb:new", async (event) => {
    await handleSBNewEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("Delayed-sb:new", async (event) => {
    await handleSBNewEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("Cancelled-sb:new", async (event) => {
    await handleSBNewEvent(db, event, add_new_notification);
  });

  useFrappeDocTypeEventListener("Sent Back Category", async (event) => {
    if (role === "Nirmaan Admin Profile" || user_id === "Administrator") {
      await adminSBDataMutate();
    } else {
      await sbDataMutate();
    }
  });

  //  ***** PO Events *****
  useFrappeEventListener("po:amended", async (event) => {
    await handlePOAmendedEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("po:new", async (event) => {
    await handlePONewEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("po:delete", (event) => {
    handlePRDeleteEvent(event, delete_notification);
  });

  useFrappeDocTypeEventListener("Procurement Orders", async (event) => {
    if (role === "Nirmaan Admin Profile" || user_id === "Administrator") {
      await adminPODataMutate();
    } else {
      await poDataMutate();
    }
  });

  //  ***** SR Events *****
  useFrappeEventListener("sr:vendorSelected", async (event) => {
    await handleSRVendorSelectedEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("sr:approved", async (event) => {
    await handleSRApprovedEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("sr:delete", (event) => {
    handlePRDeleteEvent(event, delete_notification);
  });

  useFrappeEventListener("sr:amended", (event) => {
    handleSOAmendedEvent(db, event, add_new_notification);
  });

  useFrappeDocTypeEventListener("Service Requests", async (event) => {
    if (role === "Nirmaan Admin Profile" || user_id === "Administrator") {
      await adminSRDataMutate();
    } else {
      await srDataMutate();
    }
  });

   //  ***** Project Payment Events *****
   useFrappeEventListener("payment:new", async (event) => {
    await handlePONewEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("payment:approved", async (event) => {
    await handleSRApprovedEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("payment:fulfilled", async (event) => {
    await handlePONewEvent(db, event, add_new_notification);
  });

  useFrappeEventListener("payment:delete", (event) => {
    handlePRDeleteEvent(event, delete_notification);
  });

  useFrappeDocTypeEventListener("Project Payments", async (event) => {
    if (role === "Nirmaan Admin Profile" || user_id === "Administrator") {
      await adminPaymentsDataMutate();
    } else {
      await paymentsDataMutate();
    }
  });

  // useFrappeEventListener("pr:statusChanged", async (event) => { // not working
  //     await handlePRStatusChangedEvent(role, user_id);
  // });

  // useFrappeEventListener("pr:resolved", async (event) => {
  //     await handlePRResolvedEvent(db, event, role, user_id, add_new_notification, mutate);
  // });

  // console.log("new Notifications", notifications)

  const requestNotificationPermission = async () => {
    if (user_id && data) {
      try {
        const permission = await Notification.requestPermission();
        if (permission == "granted") {
          const registration = await navigator.serviceWorker.ready;
          const token = await getToken(messaging, {
            vapidKey: VAPIDKEY,
            serviceWorkerRegistration: registration,
          });
          if (data?.fcm_token !== token) {
            console.log("running fcm token updating");
            // Update token if it's different from the stored one
            await updateDoc("Nirmaan Users", user_id, {
              fcm_token: token,
              push_notification: "true",
            });
            console.log("Updated FCM Token:", token);
          } else if (data?.push_notification !== "true") {
            await updateDoc("Nirmaan Users", user_id, {
              push_notification: "true",
            });
            console.log("FCM Token already up-to-date.");
          }
        } else {
          if (data?.push_notification === "true") {
            await updateDoc("Nirmaan Users", user_id, {
              push_notification: "false",
            });
          }
          console.log("Unable to get permission to notify.");
        }
      } catch (error) {
        console.error("Error getting notification permission:", error);
      }
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, [user_id, data]);

  const items = useMemo(() => [
    { key: "/", icon: LayoutGrid, label: "Dashboard" },
    ...(user_id == "Administrator" || role == "Nirmaan Admin Profile"
      ? [
          {
            key: "admin-actions",
            icon: Shapes,
            label: "Admin Options",
            children: [
              { key: "/projects", label: "Projects" },
              { key: "/users", label: "Users" },
              { key: "/products", label: "Products" },
              { key: "/vendors", label: "Vendors" },
              { key: "/customers", label: "Customers" },
              { key: "/product-packages", label: "Product Packages" },
              { key: "/approved-quotes", label: "Approved Quotations" },
            ],
          },
        ]
      : []),
      ...(role == "Nirmaan Project Lead Profile"
        ? [
            {
              key: "/projects",
              icon: BlendIcon,
              label: "Projects",
            },
          ]
        : []),
    // ...(["Nirmaan Project Lead Profile", "Nirmaan Admin Profile"].includes(
    //   role
    // ) || user_id == "Administrator"
    //   ? [
    //       {
    //         key: "pl-actions",
    //         icon: Building2,
    //         label: "Procurement Actions",
    //         children: [
    //           { key: "/prs&milestones", label: "PRs & Milestones" },
              // {
              //   key: "/approve-new-pr",
              //   label: "Approve PR",
              //   count:
              //     role === "Nirmaan Admin Profile" ||
              //     user_id === "Administrator"
              //       ? adminPrCounts.pending
              //       : prCounts.pending,
              // },
              // {
              //   key: "/approve-po",
              //   label: "Approve PO",
              //   count:
              //     role === "Nirmaan Admin Profile" ||
              //     user_id === "Administrator"
              //       ? adminPrCounts.approve
              //       : prCounts.approve,
              // },
              // {
              //   key: "/approve-amended-po",
              //   label: "Approve Amended PO",
              //   count:
              //     role === "Nirmaan Admin Profile" ||
              //     user_id === "Administrator"
              //       ? adminAmendPOCount
              //       : amendPOCount,
              // },
              // {
              //   key: "/approve-sent-back",
              //   label: "Approve Sent Back PO",
              //   count:
              //     role === "Nirmaan Admin Profile" ||
              //     user_id === "Administrator"
              //       ? adminNewApproveSBCount
              //       : newSBApproveCount,
              // },
              // {
              //   key: "/approve-service-request",
              //   label: "Approve Service Order",
              //   count:
              //     role === "Nirmaan Admin Profile" ||
              //     user_id === "Administrator"
              //       ? adminSelectedSRCount
              //       : selectedSRCount,
              // },
              // {
              //   key: "/approve-amended-so",
              //   label: "Approve Amended SO",
              //   count:
              //     role === "Nirmaan Admin Profile" ||
              //     user_id === "Administrator"
              //       ? adminAmendedSRCount
              //       : amendedSRCount,
              // },
              // ...(role !== "Nirmaan Project Lead Profile" ? [
              //   {
              //     key: "/approve-payments",
              //     label: "Approve Payments",
              //     count:
              //       role === "Nirmaan Admin Profile" ||
              //       user_id === "Administrator"
              //         ? adminPaymentsCount.requested
              //         : paymentsCount.requested,
              //   },
              // ] : []),
      //       ],
      //     },
      //   ]
      // : []),
    ...([
      "Nirmaan Procurement Executive Profile",
      "Nirmaan Admin Profile",
      "Nirmaan Project Lead Profile"
    ].includes(role) || user_id == "Administrator"
      ? [
          {
            key: "/procurement-requests",
            icon: List,
            label: "Procurement Requests",
            // count: role === "Nirmaan Admin Profile" ||
            //         user_id === "Administrator"
            //         ? adminPrCounts.approved
            //         : prCounts.approved,
          },
        ]
      : []),
    ...([
      "Nirmaan Procurement Executive Profile",
      "Nirmaan Admin Profile",
      "Nirmaan Project Lead Profile",
    ].includes(role) || user_id == "Administrator"
      ? [
          {
            key: "/service-requests",
            icon: SquareSquare,
            label: "Service Requests",
            // count: role === "Nirmaan Admin Profile" ||
            //         user_id === "Administrator"
            //         ? (adminPendingSRCount || 0) + (adminApprovedSRCount || 0)
            //         : (pendingSRCount || 0) + (approvedSRCount || 0),
          },
          {
            key: "/purchase-orders",
            icon: ShoppingCart,
            label: "Purchase Orders",
            // count:
            //      role === "Nirmaan Admin Profile" ||
            //      user_id === "Administrator"
            //        ? adminNewPOCount
            //        : newPOCount,
          },
        ]
      : []),
    // ...(role == "Nirmaan Procurement Executive Profile" ||
    // user_id == "Administrator" ||
    // role == "Nirmaan Admin Profile"
    //   ? [
    //       {
    //         key: "/sent-back-requests",
    //         icon: SendToBack,
    //         label: "Sent Back Requests",
    //         count:
    //              role === "Nirmaan Admin Profile" ||
    //              user_id === "Administrator"
    //                ? (adminNewSBCounts.rejected || 0) + (adminNewSBCounts.cancelled || 0) + (adminNewSBCounts.delayed || 0)
    //                : (newSBCounts.rejected || 0) + (newSBCounts.cancelled || 0) + (newSBCounts.delayed || 0),
    //       },
    //     ]
    //   : []),
      ...(user_id == "Administrator" || ["Nirmaan Accountant Profile", "Nirmaan Admin Profile", "Nirmaan Project Lead Profile", "Nirmaan Procurement Executive Profile", "Nirmaan Project Manager Profile"].includes(role)
        ? [
            {
                key: '/project-payments',
                icon: CircleDollarSign,
                label: 'Project Payments',
            },
        ]
        : []),
        ...(user_id == "Administrator" || ["Nirmaan Accountant Profile", "Nirmaan Admin Profile"].includes(role)
        ? [
            {
                key: '/in-flow-payments',
                icon: HandCoins,
                label: 'In-Flow Payments',
            },
        ]
        : []),
        ...(user_id == "Administrator" || ["Nirmaan Accountant Profile", "Nirmaan Admin Profile", "Nirmaan Procurement Executive Profile"].includes(role)
        ? [
            {
                key: '/invoice-reconciliation',
                icon: ReceiptText,
                label: 'Invoice Recon',
            },
        ]
        : []),
        ...(user_id == "Administrator" || ["Nirmaan Accountant Profile", "Nirmaan Admin Profile", "Nirmaan Procurement Executive Profile"].includes(role)
        ? [
            {
                key: '/reports',
                icon: ClipboardMinus,
                label: 'Reports',
            },
        ]
        : [])
  ], [user_id, role]);

  const allKeys = useMemo(() => new Set([
    "projects",
    "users",
    "products",
    "vendors",
    "customers",
    "product-packages",
    "approved-quotes",
    "prs&milestones",
    // "approve-new-pr",
    // "approve-po",
    // "approve-sent-back",
    // "approve-amended-po",
    // "approve-payments",
    "procurement-requests",
    "purchase-orders",
    "sent-back-requests",
    "service-requests",
    "service-requests-list",
    // "approve-service-request",
    // "approve-amended-so",
    // "choose-service-vendor",
    // "approved-sr",
    "notifications",
    "project-payments",
    "in-flow-payments",
    'invoice-reconciliation',
    'reports',
  ]), [])

  const selectedKeys = useMemo(() => {
    const pathKey = location.pathname.slice(1).split("/")[0];
    return allKeys.has(pathKey) ? pathKey : "";
  }, [location.pathname]);


  const groupMappings = useMemo(() => ({
    "admin-actions": ["users", "products", "vendors", "customers", "product-packages", "approved-quotes"],
    // "pl-actions": [
    //   "prs&milestones", "approve-po", "approve-sent-back",
    //   "approve-amended-po", "approve-payments"
    // ],
    "/procurement-requests": ["procurement-requests", "prs&milestones", "sent-back-requests"],
    "/service-requests": ["service-requests", "service-requests-list"],
    "/purchase-orders": ["purchase-orders"],
    // "/sent-back-requests": ["sent-back-requests"],
    "/project-payments": ["project-payments"],
    "/in-flow-payments": ["in-flow-payments"],
    "/invoice-reconciliation": ["invoice-reconciliation"],
    "/reports": ["reports"]
  }), []);

  const openKey = useMemo(() => {
    for (const [group, keys] of Object.entries(groupMappings)) {
      if (keys.includes(selectedKeys)) return group;
    }
    return selectedKeys === "projects"
      ? role === "Nirmaan Project Lead Profile"
        ? "/projects"
        : "admin-actions"
      : "";
  }, [selectedKeys, role, groupMappings]);
  

  // const defaultOpenKeys = useMemo(() => {
  //   return new Set(["admin-actions"]);
  // }, [openKey]);

  const handleCloseMobile = useCallback(() => {
    if (isMobile) {
      toggleSidebar();
    }
  }, [isMobile, toggleSidebar]);

  useEffect(() => {
    if(["admin-actions"].includes(openKey)) {
      setCollapsedKey(openKey)
    }
  }, [])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-center">
        {!isMobile ? (
          state === "expanded" && (
            <Link to={"/"}>
              <img src={logo} alt="Nirmaan" width="140" height="40" />
            </Link>
          )
        ) : (
          <Link to={"/"}>
            <img
              onClick={handleCloseMobile}
              src={logo}
              alt="Nirmaan"
              width="140"
              height="40"
            />
          </Link>
        )}
        <SidebarTrigger
          className={`${state === "expanded" && "bg-gray-100"}`}
        />
      </SidebarHeader>
      <Separator />
      <SidebarContent className="scrollbar-container overflow-x-hidden">
        <SidebarGroup>
          <SidebarMenu>
            {items.map((item) => (
              <Collapsible
                key={item.key}
                open={collapsedKey === item?.key}
                // defaultOpen={defaultOpenKeys.has(item.key)}
                className="group/collapsible"
                asChild
              >
                <SidebarMenuItem>
                  {new Set(["Dashboard", "Procurement Requests", "Purchase Orders", "Project Payments", "Sent Back Requests", "Projects", "Service Requests", "In-Flow Payments", "Invoice Recon", "Reports"]).has(item?.label) ? (
                    <SidebarMenuButton
                      className={`${
                        ((!openKey && selectedKeys !== "notifications" && item?.label === "Dashboard") || item?.key === openKey)
                          ? "bg-[#FFD3CC] text-[#D03B45] hover:text-[#D03B45] hover:bg-[#FFD3CC]"
                          : ""
                      } tracking-tight relative`}
                      onClick={() => {
                        if (isMobile) {
                          toggleSidebar();
                        }
                        navigate(item?.label === "Dashboard" ? "/" : item?.key);
                      }}
                      selectedKeys={selectedKeys}
                      tooltip={item.label}
                    >
                      {item.icon && <item.icon />}
                      <span className="font-medium">{item.label}</span>
                      {item?.count !== 0 && state === "expanded" && (
                            <span className="absolute top-2 right-4 text-xs font-medium tabular-nums text-sidebar-foreground h-4 w-4 flex items-center justify-center">
                              {item.count}
                        </span>
                      )}
                    </SidebarMenuButton>
                  ) : (
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={`${
                          openKey === item?.key
                            ? `text-[#D03B45]  hover:text-[#D03B45] !important ${
                                state === "collapsed" &&
                                !isMobile &&
                                "bg-[#FFD3CC]"
                              }`
                            : ""
                        } tracking-tight`}
                        onClick={() => handleGroupToggle(item.key)}
                        selectedKeys={selectedKeys}
                        tooltip={item.children}
                      >
                        {item.icon && <item.icon />}
                        <span className="font-medium">{item.label}</span>
                        <ChevronRight className="ml-auto mr-2 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  )}
                  <CollapsibleContent 
                  className={`${collapsedKey === item?.key ? "animate-collapse-down" : "animate-collapse-up"}`}
                  >
                    <SidebarMenuSub className="space-y-1">
                      {item?.children?.map((subitem) => (
                        <SidebarMenuSubItem
                          className="relative"
                          key={subitem.key}
                        >
                          <SidebarMenuSubButton
                            onClick={handleCloseMobile}
                            className={`${
                              `/${selectedKeys}` === subitem.key
                                ? "bg-[#FFD3CC] text-[#D03B45] hover:text-[#D03B45] hover:bg-[#FFD3CC]"
                                : ""
                            } rounded-md ${isMobile ? "w-60" : "w-52"}`}
                            asChild
                          >
                            <Link to={subitem.key}>
                              <span className="text-xs">{subitem.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                          {subitem?.count !== 0 && (
                            <span className="absolute top-2 -right-2 text-xs font-medium tabular-nums text-sidebar-foreground h-4 w-4 flex items-center justify-center">
                              {subitem.count}
                            </span>
                          )}
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="overflow-y-auto overflow-x-hidden">
        <Separator />
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
