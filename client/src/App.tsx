import { useEffect, useState } from "react";
import {
  fetchCurrentUser,
  logout as apiLogout,
  type AuthUser,
  type MyTicket,
  type Role,
  type StaffTicket,
} from "./api.js";
import ChangePassword from "./ChangePassword.js";
import CreateTicket from "./CreateTicket.js";
import Login from "./Login.js";
import MyTickets from "./MyTickets.js";
import StaffTicketDetail from "./StaffTicketDetail.js";
import StaffTicketQueue from "./StaffTicketQueue.js";
import TicketDetail from "./TicketDetail.js";
import UserManagement from "./UserManagement.js";

// Lab 3 (Issue 19) — authenticated shell: Login -> (mandatory) Change Password
// -> role-specific home with role badge + Logout (ui-spec.md §3.3).
type View =
  | "my-tickets"
  | "create-ticket"
  | "ticket-detail"
  | "staff-queue"
  | "staff-detail"
  | "user-management";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "gated"; user: AuthUser }
  | { status: "authenticated"; user: AuthUser };

const ROLE_LABELS: Record<Role, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMIN: "Administrator",
};

const ROLE_BADGE_CLASS: Record<Role, string> = {
  REQUESTER: "badge-role-requester",
  IT_STAFF: "badge-role-staff",
  ADMIN: "badge-role-admin",
};

function defaultViewFor(role: Role): View {
  if (role === "IT_STAFF") return "staff-queue";
  if (role === "ADMIN") return "user-management";
  return "my-tickets";
}

function RoleBadge({ role }: { role: Role }) {
  return <span className={`badge ${ROLE_BADGE_CLASS[role]}`}>{ROLE_LABELS[role]}</span>;
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [view, setView] = useState<View>("my-tickets");
  const [selectedTicket, setSelectedTicket] = useState<MyTicket | null>(null);
  const [selectedStaffTicket, setSelectedStaffTicket] = useState<StaffTicket | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          setAuth({ status: "anonymous" });
        } else if (user.requiresPasswordChange) {
          setAuth({ status: "gated", user });
        } else {
          setAuth({ status: "authenticated", user });
          setView(defaultViewFor(user.role));
        }
      })
      .catch(() => {
        if (!cancelled) setAuth({ status: "anonymous" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleAuthenticated(user: AuthUser) {
    setNotice(null);
    if (user.requiresPasswordChange) {
      setAuth({ status: "gated", user });
      return;
    }
    setAuth({ status: "authenticated", user });
    setView(defaultViewFor(user.role));
  }

  function handlePasswordChanged(user: AuthUser) {
    setAuth({ status: "authenticated", user });
    setView(defaultViewFor(user.role));
    setNotice("Password updated.");
  }

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      // Even if the call fails, drop local access and show the login screen.
    }
    setSelectedTicket(null);
    setSelectedStaffTicket(null);
    setNotice(null);
    setAuth({ status: "anonymous" });
  }

  if (auth.status === "loading") {
    return (
      <div className="container py-5">
        <p className="text-secondary" role="status">
          Loading…
        </p>
      </div>
    );
  }

  if (auth.status === "anonymous") {
    return <Login onAuthenticated={handleAuthenticated} />;
  }

  if (auth.status === "gated") {
    return <ChangePassword user={auth.user} onChanged={handlePasswordChanged} />;
  }

  const { user } = auth;
  const currentPageFor = (active: boolean) => (active ? "page" : undefined);
  const myTicketsActive = view === "my-tickets" || view === "ticket-detail";
  const createTicketActive = view === "create-ticket";
  const staffQueueActive = view === "staff-queue" || view === "staff-detail";
  const userManagementActive = view === "user-management";

  return (
    <div className="app-shell">
      <header className="app-header py-3 mb-4" style={{ background: "#006B3C" }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h1 className="h4 mb-0 text-white">
                TokTickIT <span className="opacity-75">IT Service Desk</span>
              </h1>
              <div className="text-white-50 small">
                Signed in: <strong className="text-white">{user.name}</strong> <RoleBadge role={user.role} />
              </div>
            </div>
            <button type="button" className="btn btn-sm btn-tok-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>

          <nav className="nav nav-pills mt-3" aria-label="Primary navigation">
            {user.role === "REQUESTER" && (
              <>
                <button
                  type="button"
                  className={`nav-link ${myTicketsActive ? "active" : ""}`}
                  style={myTicketsActive ? { background: "#0B7A46" } : { color: "#fff" }}
                  onClick={() => setView("my-tickets")}
                  aria-current={currentPageFor(myTicketsActive)}
                >
                  My Tickets
                </button>
                <button
                  type="button"
                  className={`nav-link ${createTicketActive ? "active" : ""}`}
                  style={createTicketActive ? { background: "#0B7A46" } : { color: "#fff" }}
                  onClick={() => setView("create-ticket")}
                  aria-current={currentPageFor(createTicketActive)}
                >
                  Create Ticket
                </button>
              </>
            )}
            {user.role === "IT_STAFF" && (
              <button
                type="button"
                className={`nav-link ${staffQueueActive ? "active" : ""}`}
                style={staffQueueActive ? { background: "#0B7A46" } : { color: "#fff" }}
                onClick={() => setView("staff-queue")}
                aria-current={currentPageFor(staffQueueActive)}
              >
                Ticket Queue
              </button>
            )}
            {user.role === "ADMIN" && (
              <button
                type="button"
                className={`nav-link ${userManagementActive ? "active" : ""}`}
                style={userManagementActive ? { background: "#0B7A46" } : { color: "#fff" }}
                onClick={() => setView("user-management")}
                aria-current={currentPageFor(userManagementActive)}
              >
                User Management
              </button>
            )}
          </nav>
        </div>
      </header>

      <div className="container" style={{ maxWidth: 960 }}>
        {notice && (
          <div className="alert alert-success" role="status">
            {notice}
          </div>
        )}

        {user.role === "REQUESTER" ? (
          view === "create-ticket" ? (
            <CreateTicket requester={user} onViewTickets={() => setView("my-tickets")} />
          ) : view === "ticket-detail" && selectedTicket ? (
            <TicketDetail
              requester={user}
              ticket={selectedTicket}
              onBack={() => setView("my-tickets")}
            />
          ) : (
            <MyTickets
              key={user.id}
              requester={user}
              onCreate={() => setView("create-ticket")}
              onViewTicket={(t) => {
                setSelectedTicket(t);
                setView("ticket-detail");
              }}
            />
          )
        ) : user.role === "IT_STAFF" ? (
          view === "staff-detail" && selectedStaffTicket ? (
            <StaffTicketDetail
              user={user}
              ticket={selectedStaffTicket}
              onBack={() => setView("staff-queue")}
            />
          ) : (
            <StaffTicketQueue
              user={user}
              onOpenTicket={(t) => {
                setSelectedStaffTicket(t);
                setNotice(null);
                setView("staff-detail");
              }}
            />
          )
        ) : (
          <UserManagement
            user={user}
            onSelfUpdated={(updated) => setAuth({ status: "authenticated", user: updated })}
          />
        )}
      </div>
    </div>
  );
}
