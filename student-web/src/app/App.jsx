import { useState } from "react";
import Login from "../features/auth/Login.jsx";
import StudentDashboard from "../features/dashboard/StudentDashboard.jsx";
import StudentDirectory from "../features/students/StudentDirectory.jsx";
import StudentProfileHistory from "../features/students/StudentProfileHistory.jsx";
import PendingConfirmations from "../features/students/PendingConfirmations.jsx";
import CoursesCatalog from "../features/courses/CoursesCatalog.jsx";
import CourseDetail from "../features/courses/CourseDetail.jsx";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [focusedStudentId, setFocusedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setCurrentView("dashboard");
  };

  const openDashboard = () => {
    setCurrentView("dashboard");
  };

  const openStudents = () => {
    setCurrentView("students");
  };

  const openCourses = () => {
    setCurrentView("courses");
  };

  const openPending = () => {
    setCurrentView("pending");
  };

  const openCourseDetail = (course) => {
    setSelectedCourse(course);
    setCurrentView("course-detail");
  };

  const clearFocusedStudent = () => {
    setFocusedStudentId(null);
  };

  const handleViewProfile = (student) => {
    setSelectedStudent(student);
    setFocusedStudentId(student.id);
    setCurrentView("profile");
  };

  const openProfile = (student) => {
    if (student) {
      setSelectedStudent(student);
      setFocusedStudentId(student.id);
    }
    setCurrentView("profile");
  };

  const openStudentsFromProfile = () => {
    setCurrentView("students");
  };

  if (isLoggedIn && currentView === "students") {
    return (
      <StudentDirectory
        onOpenDashboard={openDashboard}
        onOpenCourses={openCourses}
        onOpenPending={openPending}
        onViewProfile={handleViewProfile}
      />
    );
  }

  if (isLoggedIn && currentView === "profile") {
    return (
      <StudentProfileHistory
        student={selectedStudent}
        onOpenDashboard={openDashboard}
        onOpenStudents={openStudentsFromProfile}
        onOpenCourses={openCourses}
        onOpenPending={openPending}
      />
    );
  }

  if (isLoggedIn && currentView === "pending") {
    return (
      <PendingConfirmations
        onOpenDashboard={openDashboard}
        onOpenStudents={openStudents}
        onOpenCourses={openCourses}
        onViewProfile={handleViewProfile}
      />
    );
  }

  if (isLoggedIn && currentView === "courses") {
    return (
      <CoursesCatalog
        onOpenDashboard={openDashboard}
        onOpenStudents={openStudents}
        onOpenPending={openPending}
        onOpenCourseDetail={openCourseDetail}
      />
    );
  }

  if (isLoggedIn && currentView === "course-detail") {
    return (
      <CourseDetail
        course={selectedCourse}
        onOpenDashboard={openDashboard}
        onOpenStudents={openStudents}
        onOpenCourses={openCourses}
        onOpenPending={openPending}
      />
    );
  }

  if (isLoggedIn) {
    return (
      <StudentDashboard
        onOpenStudents={openStudents}
        onOpenCourses={openCourses}
        onOpenPending={openPending}
        onOpenProfile={openProfile}
        focusedStudentId={focusedStudentId}
        onFocusedStudentHandled={clearFocusedStudent}
      />
    );
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}

export default App;
