import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import { Project, sanitizeProject } from "../types";

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "project_smart_bus",
    title: "Smart Campus Bus Tracking System",
    description: "An AI-powered real-time bus tracking and seat prediction system for college campuses, featuring GPS tracking, ETA predictions, and smart seat availability alerts.",
    problemStatement: "College students waste significant time waiting at bus stops without knowing when buses will arrive or if seats are available. Current systems lack real-time tracking and predictive capabilities, leading to overcrowding during peak hours and missed classes.\n\nStudents have no way to plan their commute effectively, resulting in frustration and decreased productivity. The administration also lacks data to optimize bus routes and schedules.",
    objectives: "1. Develop a real-time GPS-based bus tracking system accessible via mobile app.\n2. Implement AI-driven seat availability prediction using historical ridership data.\n3. Create an automated ETA notification system with push alerts.\n4. Build an admin dashboard for route optimization and fleet management.\n5. Integrate with college timetable for smart scheduling recommendations.",
    realWorldProblem: "Traffic congestion, unpredictable delays, and overcrowding are common problems in campus commute. A real-world hardware IoT deployment with machine learning provides a scientific solution.",
    existingSystem: "Current campus transportation relies on fixed timetables posted on notice boards. Students have no real-time visibility into bus locations or capacity. Manual headcounts are used for planning, which is inaccurate and labor-intensive. No digital platform exists for student feedback or route suggestions.",
    proposedSystem: "A full-stack IoT + AI solution with GPS trackers on all campus buses, a mobile app for students showing live locations and predicted seat availability, and an admin dashboard with analytics. The system uses machine learning to predict crowding patterns and suggest optimal departure times to students.",
    modules: [
      "GPS Tracking Module — Real-time bus location using IoT sensors",
      "Student Mobile App — Live map, ETA, seat prediction, notifications",
      "AI Prediction Engine — ML model for ridership and seat availability forecasting",
      "Admin Dashboard — Fleet management, route optimization, analytics",
      "Notification Service — Push notifications, SMS alerts for bus arrivals",
      "Feedback & Rating Module — Student feedback collection and route suggestions"
    ],
    features: [
      "Real-time bus location on interactive map",
      "AI-predicted seat availability with confidence scores",
      "Push notification alerts for approaching buses",
      "Historical ridership analytics dashboard",
      "Route optimization suggestions using ML",
      "Student feedback and rating system",
      "Integration with college timetable API",
      "Emergency SOS button for safety",
      "Multi-language support",
      "Offline mode with cached schedules"
    ],
    technologyStack: ["React Native", "Node.js", "MongoDB", "TensorFlow", "Socket.io", "Google Maps API", "Redis", "Docker"],
    category: "IoT",
    difficulty: "Advanced",
    branch: "Computer Science",
    semester: "Semester 6",
    duration: 45,
    teamSize: 4,
    teamMembers: "Arjun Patel (IoT Lead), Maya Sen (Mobile Dev), Rohan Das (Backend Dev), Simran Kaur (ML Engineer)",
    folderStructure: `smart-bus-tracker/
├── mobile-app/         # React Native mobile client
├── backend/            # Express.js Node core API
├── ai-model/           # ML seat prediction model
├── admin-dashboard/    # React SPA for fleet management
└── docker-compose.yml`,
    apiStructure: `POST   /api/auth/login            - Student/Admin login
GET    /api/buses                 - List all active buses
GET    /api/buses/:id/location    - Get real-time bus location
GET    /api/buses/:id/seats       - Get seat availability prediction`,
    databaseDesign: `Collections:
users: { _id, name, email, role, college_id }
buses: { _id, bus_number, capacity, current_location }
routes: { _id, name, stops[], schedule }`,
    roadmap: [
      { title: "Hardware Integration & Setup", description: "Design GPS tracking unit using Arduino/ESP32 and configure MQTT.", date: "Week 1-2", done: true },
      { title: "Backend API & Database", description: "Setup MongoDB schemas and Express routes.", date: "Week 3", done: true },
      { title: "Live Sync with WebSockets", description: "Integrate Socket.io for low-latency live GPS location updates.", date: "Week 4", done: true }
    ],
    timeline: "Phase 1: Research & Hardware (Weeks 1-2)\nPhase 2: Database Schema & APIs (Week 3)\nPhase 3: Real-Time Sync (Week 4)",
    futureScope: "We plan to expand the predictive model to account for dynamic real-time local weather forecasts and campus events.",
    testingPlan: "Unit testing for Express API endpoints using Jest. Validation of ML seat prediction models against a test dataset.",
    deploymentGuide: "Deploy Node/Express to GCP/AWS ECS. Publish React Native application to Expo Go.",
    readme: "# Smart Campus Bus Tracking System\n\nAI-powered real-time tracking for engineering universities.",
    githubLink: "https://github.com/arjun/smart-bus-tracker",
    liveDemoLink: "https://smartbus.college.edu",
    screenshots: ["https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60"],
    demoVideoUrl: "",
    ownerId: "user_arjun",
    ownerName: "Arjun Patel",
    isDraft: false,
    visibility: "Public",
    allowDownload: true,
    allowFork: true,
    likes: ["user_priya", "user_suryasekhar"],
    saves: ["user_suryasekhar"],
    commentsCount: 2,
    forksCount: 0,
    createdDate: "2026-05-24T10:00:00Z",
    qualityScore: 92
  },
  {
    id: "project_code_editor",
    title: "Real-Time Collaborative Code Editor",
    description: "A collaborative code editor similar to VS Code, supporting real-time multi-user editing, visual cursor tracking, and inline sandboxed execution.",
    problemStatement: "Engineering students lack simple platforms for remote pair programming and real-time collaboration on group projects.",
    objectives: "1. Build an in-browser code editor with multi-language syntax highlighting.\n2. Establish real-time collaboration using Y.js and WebSockets (CRDTs).",
    technologyStack: ["React", "Node.js", "Y.js", "Express", "Socket.io", "Docker", "Tailwind CSS"],
    category: "Web Development",
    difficulty: "Expert",
    branch: "Computer Science",
    semester: "Semester 7",
    duration: 60,
    teamSize: 3,
    teamMembers: "Priya Sharma (Tech Lead), Kabir Mehta (Frontend Engineer), Alice Wong (Security & DevOps)",
    screenshots: ["https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&auto=format&fit=crop&q=60"],
    githubLink: "https://github.com/priya/collab-code-editor",
    liveDemoLink: "https://code.projectverse.dev",
    ownerId: "user_priya",
    ownerName: "Priya Sharma",
    isDraft: false,
    visibility: "Public",
    allowDownload: true,
    allowFork: true,
    likes: ["user_arjun", "user_suryasekhar"],
    saves: ["user_suryasekhar"],
    commentsCount: 0,
    forksCount: 0,
    createdDate: "2026-06-02T14:30:00Z",
    qualityScore: 95
  },
  {
    id: "project_ecommerce",
    title: "E-Commerce Microservices",
    description: "A highly resilient e-commerce architecture built using Node.js microservices, gRPC communication protocols, and a centralized API gateway.",
    problemStatement: "Monolithic ecommerce architectures degrade in performance under high load spikes.",
    objectives: "1. Build 5 distinct microservices.\n2. Set up inter-service RPC communication via gRPC.",
    technologyStack: ["Next.js", "Node.js", "Express", "PostgreSQL", "Docker", "RabbitMQ", "gRPC", "Redis"],
    category: "Web Development",
    difficulty: "Expert",
    branch: "Computer Science",
    semester: "Semester 8",
    duration: 90,
    teamSize: 5,
    teamMembers: "Rahul Mehta (Arch Dev), Sarah Jenkins (DevOps), David Lee (Backend), Chloe Bennett (Frontend)",
    screenshots: ["https://images.unsplash.com/photo-1557821552-17105176677c?w=800&auto=format&fit=crop&q=60"],
    ownerId: "user_rahul",
    ownerName: "Rahul Mehta",
    isDraft: false,
    visibility: "Public",
    allowDownload: true,
    allowFork: true,
    likes: ["user_priya"],
    saves: [],
    commentsCount: 0,
    forksCount: 0,
    createdDate: "2026-04-10T09:00:00Z",
    qualityScore: 94
  },
  {
    id: "project_resume_analyzer",
    title: "AI-Powered Resume Analyzer",
    description: "An intelligent web application that analyzes student resumes using NLP, providing instant keyword optimization scores and AI-guided career pathway suggestions.",
    problemStatement: "Students struggle to align resumes with applicant tracking systems (ATS), often leading to early rejections.",
    objectives: "1. Create high-performance PDF/Word parser backend.\n2. Write text parsing pipelines utilizing standard TF-IDF algorithms.",
    technologyStack: ["Next.js", "Python", "FastAPI", "TensorFlow", "React", "Tailwind CSS"],
    category: "AI/ML",
    difficulty: "Intermediate",
    branch: "Computer Science",
    semester: "Semester 6",
    duration: 30,
    teamSize: 3,
    teamMembers: "Sneha Kapoor (AI Lead), Raj Patel (Frontend Developer), Kenji Sato (Backend Developer)",
    screenshots: ["https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=60"],
    ownerId: "user_sneha",
    ownerName: "Sneha Kapoor",
    isDraft: false,
    visibility: "Public",
    allowDownload: true,
    allowFork: true,
    likes: ["user_suryasekhar"],
    saves: [],
    commentsCount: 0,
    forksCount: 0,
    createdDate: "2026-05-18T16:00:00Z",
    qualityScore: 88
  },
  {
    id: "project_nexus",
    title: "nexus",
    description: "An AI-native student collaborative platform designed to orchestrate study groups, project code discovery, and real-time exam preparation boards.",
    problemStatement: "Engineering students lack unified visual workspaces to coordinate codebases, brainstorm solutions, and receive instant AI feedback.",
    objectives: "1. Create a workspace orchestrating real-time team task management.\n2. Integrate semantic workspace files and code snippets search.",
    technologyStack: ["React", "Node.js", "Python", "MongoDB", "Express", "Socket.io", "Tailwind CSS"],
    category: "Mobile App",
    difficulty: "Intermediate",
    branch: "Computer Science",
    semester: "Semester 8",
    duration: 50,
    teamSize: 3,
    teamMembers: "Suryasekhar beta (Project Lead & Architect), Arjun Patel (Database Design), Priya Sharma (Frontend developer)",
    screenshots: ["https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60"],
    githubLink: "https://github.com/sekharbeta/nexus",
    liveDemoLink: "https://nexus.projectverse.dev",
    ownerId: "user_suryasekhar",
    ownerName: "Suryasekhar beta",
    isDraft: false,
    visibility: "Public",
    allowDownload: true,
    allowFork: true,
    likes: ["user_arjun"],
    saves: [],
    commentsCount: 0,
    forksCount: 0,
    createdDate: "2026-06-15T11:00:00Z",
    qualityScore: 90
  },
  {
    id: "project_smart_agri",
    title: "IoT-Based Smart Agriculture System",
    description: "An IoT solution for precision agriculture that monitors soil moisture, temperature, and automated drip irrigation powered by historical crop analytics.",
    problemStatement: "Inefficient irrigation and poor soil diagnostics degrade crop yield.",
    objectives: "1. Monitor real-time moisture, temperature, and light.\n2. Control water valve pumps automatically.",
    technologyStack: ["React Native", "Python", "Flask", "PostgreSQL", "C++", "MQTT"],
    category: "IoT",
    difficulty: "Advanced",
    branch: "Agricultural Engineering",
    semester: "Semester 6",
    duration: 75,
    teamSize: 4,
    teamMembers: "Vikram Singh (IoT Developer), Aditi Rao (Embedded Engineer), Kabir Sen (Frontend Developer), Devendra Roy (ML Analyst)",
    screenshots: ["https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop&q=60"],
    ownerId: "user_vikram",
    ownerName: "Vikram Singh",
    isDraft: false,
    visibility: "Public",
    allowDownload: true,
    allowFork: true,
    likes: ["user_arjun", "user_priya"],
    saves: ["user_arjun"],
    commentsCount: 0,
    forksCount: 0,
    createdDate: "2026-05-10T12:00:00Z",
    qualityScore: 89
  },
  {
    id: "project_blockchain_edu",
    title: "Blockchain-Based Academic Credentials",
    description: "A decentralized academic credentialing system allowing direct issuance, storage, and tamper-proof verification of college degrees on Ethereum smart contracts.",
    problemStatement: "Academic certificate forgery damages institutional credibility.",
    objectives: "1. Program Solidity smart contracts for certificate minting.\n2. Create academic administration minting interface.",
    technologyStack: ["React", "Solidity", "Hardhat", "Ether.js", "IPFS", "Node.js"],
    category: "Blockchain",
    difficulty: "Advanced",
    branch: "Computer Science",
    semester: "Semester 8",
    duration: 60,
    teamSize: 3,
    teamMembers: "Amit Shah (Blockchain Developer), Neha Sharma (Frontend Developer), David Vance (Smart Contract auditor)",
    screenshots: ["https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=60"],
    ownerId: "user_amit",
    ownerName: "Amit Shah",
    isDraft: false,
    visibility: "Public",
    allowDownload: true,
    allowFork: true,
    likes: ["user_priya"],
    saves: ["user_priya"],
    commentsCount: 0,
    forksCount: 0,
    createdDate: "2026-05-30T10:00:00Z",
    qualityScore: 91
  }
];

let isSeedingProjects = false;

/**
 * Idempotent seed function that ensures default projects exist in Cloud Firestore.
 * Never overwrites existing documents or user edits.
 */
export async function seedInitialProjectsIfEmpty(): Promise<void> {
  if (isSeedingProjects) return;
  isSeedingProjects = true;
  try {
    console.log("[Project Service] Verifying default projects in Cloud Firestore...");
    for (const defaultProj of DEFAULT_PROJECTS) {
      const docRef = doc(firebaseDb, "projects", defaultProj.id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const payload = {
          ...defaultProj,
          status: "published",
          createdAt: defaultProj.createdDate || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(docRef, payload, { merge: true });
        console.log(`[Project Service] Seeded default project to Firestore: ${defaultProj.id}`);
      }
    }
  } catch (err) {
    console.warn("[Project Service] Project seeding warning:", err);
  } finally {
    isSeedingProjects = false;
  }
}

/**
 * Saves or updates a project in Cloud Firestore.
 */
export async function saveProjectToFirestore(projectData: any): Promise<void> {
  try {
    const projId = projectData.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(firebaseDb, "projects", projId);
    const payload = {
      ...projectData,
      id: projId,
      status: "published",
      createdAt: projectData.createdAt || projectData.createdDate || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });
    console.log("[Project Service] Firestore Save Succeeded for projectId:", projId);
  } catch (error) {
    console.warn("[Project Service] Firestore Save Warning:", error);
  }
}

/**
 * Fetches all published projects from Cloud Firestore with zero document omission.
 */
export async function fetchProjectsFromFirestore(): Promise<Project[]> {
  try {
    const colRef = collection(firebaseDb, "projects");
    const snapshot = await getDocs(colRef);
    const projectsList: Project[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const sanitized = sanitizeProject(data, docSnap.id);
      projectsList.push(sanitized);
    });

    // If Firestore /projects is empty, trigger idempotent seed and re-evaluate
    if (projectsList.length === 0) {
      await seedInitialProjectsIfEmpty();
      const reSnapshot = await getDocs(colRef);
      reSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const sanitized = sanitizeProject(data, docSnap.id);
        projectsList.push(sanitized);
      });
    } else {
      // Ensure all default projects exist without overwriting
      seedInitialProjectsIfEmpty().catch(() => {});
    }

    // Sort in memory by date descending (handles createdDate, createdAt, or timestamp safely)
    return projectsList.sort((a, b) => {
      const timeA = new Date(a.createdDate || (a as any).createdAt || 0).getTime();
      const timeB = new Date(b.createdDate || (b as any).createdAt || 0).getTime();
      return timeB - timeA;
    });
  } catch (err: any) {
    console.warn("[Project Service] Firestore fetch error, returning DEFAULT_PROJECTS fallback:", err);
    return DEFAULT_PROJECTS.map(p => sanitizeProject(p));
  }
}

/**
 * Deletes a project from Cloud Firestore.
 */
export async function deleteProjectFromFirestore(projectId: string): Promise<boolean> {
  try {
    const docRef = doc(firebaseDb, "projects", projectId);
    await deleteDoc(docRef);
    console.log("[Project Service] Project deleted successfully from Firestore:", projectId);
    return true;
  } catch (err) {
    console.error("[Project Service] Error deleting project from Firestore:", err);
    throw err;
  }
}
