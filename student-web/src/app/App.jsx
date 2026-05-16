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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    navigate("/dashboard", { replace: true });
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
              onOpenStudents={openStudents}
              onOpenCourses={openCourses}
              onOpenPending={openPending}
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
              onOpenDashboard={openDashboard}
              onOpenCourses={openCourses}
              onOpenPending={openPending}
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
              student={routeStudent}
              onOpenDashboard={openDashboard}
              onOpenStudents={openStudents}
              onOpenCourses={openCourses}
              onOpenPending={openPending}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pending"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <PendingConfirmations
              onOpenDashboard={openDashboard}
              onOpenStudents={openStudents}
              onOpenCourses={openCourses}
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
              onOpenDashboard={openDashboard}
              onOpenStudents={openStudents}
              onOpenPending={openPending}
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
              course={routeCourse}
              onOpenDashboard={openDashboard}
              onOpenStudents={openStudents}
              onOpenCourses={openCourses}
              onOpenPending={openPending}
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
