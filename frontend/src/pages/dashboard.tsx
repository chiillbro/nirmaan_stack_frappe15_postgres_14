import { RocketIcon } from "@radix-ui/react-icons";

import { Accountant } from "@/components/layout/dashboards/dashboard-accountant";
import { Default } from "@/components/layout/dashboards/dashboard-default";
import { ProjectLead } from "@/components/layout/dashboards/dashboard-pl";
import { ProjectManager } from "@/components/layout/dashboards/dashboard-pm";
import { EstimatesExecutive } from "@/components/layout/dashboards/estimates-executive-dashboard";
import ProcurementDashboard from "@/components/layout/dashboards/procurement-dashboard";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUserData } from "@/hooks/useUserData";
import { UserContext } from "@/utils/auth/UserProvider";
import { useContext } from "react";

export default function Dashboard() {

    // const { socket} = useContext(FrappeContext) as FrappeConfig

    // useEffect(() => {
    //     // This manual management is usually handled by FrappeProvider.
    //     // Setting socket.connected = true manually doesn't actually connect it.
    //     // The SDK manages the connection lifecycle.
    
    //     // If you need to react to connection events, use the SDK's socket directly:
    //     if (socket) {
    //         const handleConnect = () => {
    //             console.log("Socket connected (via SDK):", socket.id);
    //         };
    //         const handleDisconnect = (reason: Socket.DisconnectReason) => {
    //             console.log("Socket disconnected (via SDK):", reason);
    //         };
    //         const handleConnectError = (err: Error) => {
    //              console.error("Socket connection error (via SDK):", err);
    //         };
    
    //         // Check if already connected (useful for hot-reloads)
    //         if (socket.connected) {
    //             handleConnect();
    //         }
    
    //         socket.on("connect", handleConnect);
    //         socket.on("disconnect", handleDisconnect);
    //         socket.on("connect_error", handleConnectError);
    
    
    //         // Cleanup listeners on component unmount
    //         return () => {
    //             socket.off("connect", handleConnect);
    //             socket.off("disconnect", handleDisconnect);
    //             socket.off("connect_error", handleConnectError);
    //             // **Do not** call socket.close() here if the socket is managed
    //             // globally by FrappeProvider, as it might disconnect other components.
    //             // The provider handles the overall socket lifecycle.
    //         };
    //     }
    // }, [socket]); // Depend on the socket object from the context
    
    // console.log("socket from context", socket); // Log the socket from context directly
    

    const { role, has_project } = useUserData()
    const { logout } = useContext(UserContext)


    return (
        <>

            {(role === 'Nirmaan Admin Profile') && <Default />}
            {(has_project === "false" && !["Nirmaan Admin Profile", "Nirmaan Estimates Executive Profile"].includes(role)) ?
                <Alert className="flex flex-col max-md:w-[80%] max-lg:w-[60%] w-[50%] mx-auto justify-center max-md:mt-[40%] mt-[20%]">
                    <div className="flex gap-2 items-center">
                        <RocketIcon className="h-4 w-4" />
                        <AlertTitle>Oops !!!</AlertTitle>
                    </div>

                    <AlertDescription className="flex justify-between items-center">
                        You are not Assigned to any project.
                        <Button onClick={logout}>Log Out</Button>
                    </AlertDescription>
                </Alert>
                :
                <>{role === 'Nirmaan Project Manager Profile' && <ProjectManager />}
                    {role === 'Nirmaan Project Lead Profile' && <ProjectLead />}
                    {role === 'Nirmaan Procurement Executive Profile' && <ProcurementDashboard />}
                    {role === 'Nirmaan Estimates Executive Profile' && <EstimatesExecutive />}
                    {role === 'Nirmaan Accountant Profile' && <Accountant />}
                </>
            }
        </>
    )

}