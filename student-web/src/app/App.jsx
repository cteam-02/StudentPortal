import { useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Login from "../features/auth/Login.jsx";
import StudentDashboard from "../features/dashboard/StudentDashboard.jsx";
import StudentDirectory from "../features/students/StudentDirectory.jsx";
import StudentProfileHistory from "../features/students/StudentProfileHistory.jsx";
import PendingConfirmations from "../features/students/PendingConfirmations.jsx";
import CoursesCatalog from "../features/courses/CoursesCatalog.jsx";
import CourseDetail from "../features/courses/CourseDetail.jsx";
import UserManagement from "../features/users/UserManagement.jsx";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const isLoggedIn = Boolean(currentUser);
  const [focusedStudentId, setFocusedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const routeStudent = useMemo(() => {
    return location.state?.student || selectedStudent;
  }, [location.state, selectedStudent]);

  const routeCourse = useMemo(() => {
    return location.state?.course || selectedCourse;
  }, [location.state, selectedCourse]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    navigate("/dashboard", { replace: true });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate("/login", { replace: true });
  };

  const openUsers = () => {
    navigate("/users");
  };

  const openDashboard = () => {
    navigate("/dashboard");
  };

  const openStudents = () => {
    navigate("/students");
  };

  const openPending = () => {
    navigate("/pending");
  };

  const openCourses = () => {
    navigate("/courses");
  };

  const openCourseDetail = (course) => {
    if (course) {
      setSelectedCourse(course);
      navigate(`/courses/${course.id ?? "detail"}`, {
        state: { course },
      });
      return;
    }

    navigate("/courses");
  };

  const clearFocusedStudent = () => {
    setFocusedStudentId(null);
  };

  const handleViewProfile = (student) => {
    if (!student?.id) return;

    setSelectedStudent(student);
    setFocusedStudentId(student.id);
    navigate(`/students/${student.id}`, {
      state: { student },
    });
  };

  const openProfile = (student) => {
    if (student?.id) {
      setSelectedStudent(student);
      setFocusedStudentId(student.id);
      navigate(`/students/${student.id}`, {
        state: { student },
      });
      return;
    }

    if (routeStudent?.id) {
      navigate(`/students/${routeStudent.id}`, {
        state: { student: routeStudent },
      });
      return;
    }

    navigate("/students");
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />} />
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <StudentDashboard
              currentUser={currentUser}
              onOpenStudents={openStudents}
              onOpenCourses={openCourses}
              onOpenPending={openPending}
              onOpenUsers={openUsers}
              onLogout={handleLogout}
              onOpenProfile={openProfile}
              focusedStudentId={focusedStudentId}
              onFocusedStudentHandled={clearFocusedStudent}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/students"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <StudentDirectory
              currentUser={currentUser}
              onOpenDashboard={openDashboard}
              onOpenCourses={openCourses}
              onOpenPending={openPending}
              onOpenUsers={openUsers}
              onLogout={handleLogout}
              onViewProfile={handleViewProfile}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/students/:studentId"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <StudentProfileHistory
              currentUser={currentUser}
              student={routeStudent}
              onOpenDashboard={openDashboard}
              onOpenStudents={openStudents}
              onOpenCourses={openCourses}
              onOpenPending={openPending}
              onOpenUsers={openUsers}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pending"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <PendingConfirmations
              currentUser={currentUser}
              onOpenDashboard={openDashboard}
              onOpenStudents={openStudents}
              onOpenCourses={openCourses}
              onOpenUsers={openUsers}
              onLogout={handleLogout}
              onViewProfile={handleViewProfile}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/courses"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <CoursesCatalog
              currentUser={currentUser}
              onOpenDashboard={openDashboard}
              onOpenStudents={openStudents}
              onOpenPending={openPending}
              onOpenUsers={openUsers}
              onLogout={handleLogout}
              onOpenCourseDetail={openCourseDetail}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/courses/:courseId"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <CourseDetail
              currentUser={currentUser}
              course={routeCourse}
              onOpenDashboard={openDashboard}
              onOpenStudents={openStudents}
              onOpenCourses={openCourses}
              onOpenPending={openPending}
              onOpenUsers={openUsers}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <UserManagement
              currentUser={currentUser}
              onOpenDashboard={openDashboard}
              onOpenStudents={openStudents}
              onOpenCourses={openCourses}
              onOpenPending={openPending}
              onOpenUsers={openUsers}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

function ProtectedRoute({ children, isLoggedIn }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default App;
