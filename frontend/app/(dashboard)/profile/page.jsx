import {
  BadgeCheck,
  CalendarClock,
  FileText,
  Mail,
  MapPin,
  Phone,
  Shield,
  SquareGanttChart,
  Users,
} from "lucide-react";

const userProfile = {
  name: "Aisha Ibrahim",
  initials: "AI",
  email: "aisha@lagoonholdings.mv",
  phone: "+960 789-2034",
  role: "Owner",
  organization: "Coral Estates",
  location: "Malé, Maldives",
  timezone: "GMT+5 (Malé)",
  bio: "Property investor and portfolio lead focused on luxury apartments across the Maldives. Passionate about tenant experience and automation-first operations.",
  joinedAt: "May 2021",
  lastLogin: "09 Nov 2025 · 08:42 MVT",
};

const responsibilities = [
  "Oversee strategic portfolio decisions across 18 properties",
  "Approve rent adjustments and high-value maintenance contracts",
  "Manage investor reporting and compliance filings with MIRA",
  "Coordinate with on-site teams to ensure SLA adherence",
];

const collaborators = [
  {
    name: "Ismail Hassan",
    role: "Finance Director",
    initials: "IH",
  },
  {
    name: "Muniha Ali",
    role: "Head of Operations",
    initials: "MA",
  },
  {
    name: "Yusuf Ahmed",
    role: "Maintenance Lead",
    initials: "YA",
  },
];

const activityLog = [
  {
    title: "Approved maintenance capex",
    description: "Generator overhaul for Reef Offices (MVR 120,000)",
    timestamp: "09 Nov 2025 · 08:20",
  },
  {
    title: "Updated rent escalation policy",
    description: "Applied 3.5% increase for Malé lease renewals",
    timestamp: "06 Nov 2025 · 16:45",
  },
  {
    title: "Onboarded new team member",
    description: "Invited Sana Iqbal as Portfolio Analyst",
    timestamp: "02 Nov 2025 · 11:12",
  },
];

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <header className="card flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {userProfile.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">
                {userProfile.name}
              </h1>
              <span className="badge inline-flex items-center gap-1">
                <BadgeCheck size={14} />
                Verified
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{userProfile.bio}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />
                {userProfile.email}
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone size={16} className="text-slate-400" />
                {userProfile.phone}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={16} className="text-slate-400" />
                {userProfile.location}
              </span>
            </div>
          </div>
        </div>
        <div className="grid gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" />
            {userProfile.role} · {userProfile.organization}
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-primary" />
            Last login {userProfile.lastLogin}
          </div>
          <div className="flex items-center gap-2">
              <SquareGanttChart size={16} className="text-primary" />
            Using RentApplicaiton since {userProfile.joinedAt}
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Responsibilities & Focus
          </h2>
          <ul className="space-y-3 text-sm text-slate-600">
            {responsibilities.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-3"
              >
                <Shield className="mt-0.5 h-4 w-4 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="card space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Key collaborators
            </h3>
            <p className="text-xs text-slate-500">
              Team members who frequently work with Aisha.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-600">
            {collaborators.map((person) => (
              <li
                key={person.name}
                className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-3 py-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {person.initials}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{person.name}</p>
                  <p className="text-xs text-slate-500">{person.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="card space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Recent activity
            </h3>
            <p className="text-xs text-slate-500">
              Latest actions performed across the management suite.
            </p>
          </div>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
            View full audit log
          </button>
        </header>
        <ul className="space-y-3">
          {activityLog.map((activity) => (
            <li
              key={activity.title}
              className="flex items-start justify-between rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-600"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {activity.title}
                </p>
                <p className="text-xs text-slate-500">{activity.description}</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {activity.timestamp}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4">
          <h3 className="text-base font-semibold text-slate-900">
            Documents & Certifications
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            {[
              {
                title: "MIRA tax clearance certificate",
                status: "Valid until Dec 2025",
              },
              {
                title: "AML/KYC verification",
                status: "Renewed Aug 2025",
              },
              {
                title: "Portfolio SLA handbook",
                status: "Updated Oct 2025",
              },
            ].map((doc) => (
              <li
                key={doc.title}
                className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-slate-900">{doc.title}</p>
                    <p className="text-xs text-slate-500">{doc.status}</p>
                  </div>
                </div>
                <button className="text-xs font-semibold text-primary">
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card space-y-4">
          <h3 className="text-base font-semibold text-slate-900">
            Security controls
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="font-semibold text-slate-900">
                Multi-factor authentication
              </p>
              <p className="text-xs text-slate-500">
                Enabled · Authenticator app on iOS
              </p>
            </li>
            <li className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="font-semibold text-slate-900">Password policy</p>
              <p className="text-xs text-slate-500">
                Last reset 14 Aug 2025 · Next reminder in 61 days
              </p>
            </li>
            <li className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="font-semibold text-slate-900">Login alerts</p>
              <p className="text-xs text-slate-500">
                Email alerts enabled for new devices and locations
              </p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}


