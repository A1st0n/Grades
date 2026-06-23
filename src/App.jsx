import React from 'react'
import { useAuth } from './auth'
import { Login } from './Login'

function authHeader(token) {
  return { Authorization: 'Bearer ' + token }
}

function CourseTable({ title, courses, showAdd, onAdd }) {
  return (
    <div className="box">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>Course Name</th>
            <th>Teacher</th>
            <th>Time</th>
            <th>Students Enrolled</th>
            {showAdd && <th>Add Class</th>}
          </tr>
        </thead>
        <tbody>
          {courses.length === 0 && (
            <tr><td colSpan={showAdd ? 5 : 4}>Nothing to show yet.</td></tr>
          )}
          {courses.map(course => (
            <tr key={course.id}>
              <td>{course.name}</td>
              <td>{course.teacher}</td>
              <td>{course.time}</td>
              <td>{course.spots}</td>
              {showAdd && (
                <td>
                  {course.already_enrolled ? (
                    <span className="small-text">Already added</span>
                  ) : course.full ? (
                    <span className="small-text">Full</span>
                  ) : (
                    <button onClick={() => onAdd(course.id)}>Add</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StudentPage({ user, token }) {
  const [myCourses, setMyCourses] = React.useState([])
  const [allCourses, setAllCourses] = React.useState([])
  const [page, setPage] = React.useState('mine')
  const [message, setMessage] = React.useState('')

  const loadStudentData = React.useCallback(function loadStudentData() {
    fetch('/api/student/my-courses', { headers: authHeader(token) })
      .then(r => r.json())
      .then(data => setMyCourses(data))

    fetch('/api/student/classes', { headers: authHeader(token) })
      .then(r => r.json())
      .then(data => setAllCourses(data))
  }, [token])

  React.useEffect(() => {
    loadStudentData()
  }, [loadStudentData])

  function addClass(courseId) {
    fetch('/api/student/classes/' + courseId + '/enroll', {
      method: 'POST',
      headers: authHeader(token),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setMessage(data.error)
        } else {
          setMessage('Class added!')
          loadStudentData()
        }
      })
  }

  return (
    <div>
      <h1>Welcome {user.name}!</h1>
      <div className="tabs">
        <button className={page === 'mine' ? 'active' : ''} onClick={() => setPage('mine')}>Your Courses</button>
        <button className={page === 'add' ? 'active' : ''} onClick={() => setPage('add')}>Add Courses</button>
      </div>

      {message && <p className="message">{message}</p>}

      {page === 'mine' && (
        <CourseTable title="Your Courses" courses={myCourses} showAdd={false} />
      )}

      {page === 'add' && (
        <CourseTable title="All Classes Offered" courses={allCourses} showAdd={true} onAdd={addClass} />
      )}
    </div>
  )
}

function TextInput({ label, value, onChange, type }) {
  return (
    <label>
      {label}
      <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function AdminUsers({ token }) {
  const [users, setUsers] = React.useState([])
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [displayName, setDisplayName] = React.useState('')
  const [role, setRole] = React.useState('student')
  const [message, setMessage] = React.useState('')

  const loadUsers = React.useCallback(function loadUsers() {
    fetch('/api/admin/users', { headers: authHeader(token) })
      .then(r => r.json())
      .then(data => setUsers(data))
  }, [token])

  React.useEffect(() => { loadUsers() }, [loadUsers])

  function addUser(e) {
    e.preventDefault()
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ username, password, display_name: displayName, role }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setMessage(data.error)
        else {
          setUsers(data)
          setUsername('')
          setPassword('')
          setDisplayName('')
          setRole('student')
          setMessage('User added.')
        }
      })
  }

  function editUser(user) {
    const newName = prompt('Display name:', user.display_name)
    if (newName === null) return
    const newRole = prompt('Role student, teacher, or admin:', user.role)
    if (newRole === null) return

    fetch('/api/admin/users/' + user.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ display_name: newName, role: newRole }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setMessage(data.error)
        else {
          setUsers(data)
          setMessage('User updated.')
        }
      })
  }

  function deleteUser(userId) {
    if (!confirm('Delete this user?')) return
    fetch('/api/admin/users/' + userId, {
      method: 'DELETE',
      headers: authHeader(token),
    })
      .then(r => r.json())
      .then(data => setUsers(data))
  }

  return (
    <div className="box">
      <h2>Admin: Users</h2>
      {message && <p className="message">{message}</p>}
      <form className="admin-form" onSubmit={addUser}>
        <TextInput label="Username" value={username} onChange={setUsername} />
        <TextInput label="Password" value={password} onChange={setPassword} type="password" />
        <TextInput label="Display Name" value={displayName} onChange={setDisplayName} />
        <label>
          Role
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="student">student</option>
            <option value="teacher">teacher</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <button>Add User</button>
      </form>

      <table>
        <thead><tr><th>ID</th><th>Username</th><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              <td>{user.display_name}</td>
              <td>{user.role}</td>
              <td>
                <button onClick={() => editUser(user)}>Edit</button>
                <button className="danger" onClick={() => deleteUser(user.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminCourses({ token }) {
  const [courses, setCourses] = React.useState([])
  const [name, setName] = React.useState('')
  const [teacher, setTeacher] = React.useState('')
  const [time, setTime] = React.useState('')
  const [capacity, setCapacity] = React.useState('')
  const [message, setMessage] = React.useState('')

  const loadCourses = React.useCallback(function loadCourses() {
    fetch('/api/admin/courses', { headers: authHeader(token) })
      .then(r => r.json())
      .then(data => setCourses(data))
  }, [token])

  React.useEffect(() => { loadCourses() }, [loadCourses])

  function addCourse(e) {
    e.preventDefault()
    fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ name, teacher, time, capacity: Number(capacity) }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setMessage(data.error)
        else {
          setCourses(data)
          setName('')
          setTeacher('')
          setTime('')
          setCapacity('')
          setMessage('Course added.')
        }
      })
  }

  function editCourse(course) {
    const newName = prompt('Course name:', course.name)
    if (newName === null) return
    const newTeacher = prompt('Teacher:', course.teacher)
    if (newTeacher === null) return
    const newTime = prompt('Time:', course.time)
    if (newTime === null) return
    const newCapacity = prompt('Capacity:', course.capacity)
    if (newCapacity === null) return

    fetch('/api/admin/courses/' + course.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ name: newName, teacher: newTeacher, time: newTime, capacity: Number(newCapacity) }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setMessage(data.error)
        else {
          setCourses(data)
          setMessage('Course updated.')
        }
      })
  }

  function deleteCourse(courseId) {
    if (!confirm('Delete this course? This also removes enrollments for it.')) return
    fetch('/api/admin/courses/' + courseId, {
      method: 'DELETE',
      headers: authHeader(token),
    })
      .then(r => r.json())
      .then(data => setCourses(data))
  }

  return (
    <div className="box">
      <h2>Admin: Courses</h2>
      {message && <p className="message">{message}</p>}
      <form className="admin-form" onSubmit={addCourse}>
        <TextInput label="Course Name" value={name} onChange={setName} />
        <TextInput label="Teacher" value={teacher} onChange={setTeacher} />
        <TextInput label="Time" value={time} onChange={setTime} />
        <TextInput label="Capacity" value={capacity} onChange={setCapacity} type="number" />
        <button>Add Course</button>
      </form>

      <table>
        <thead><tr><th>ID</th><th>Course</th><th>Teacher</th><th>Time</th><th>Enrolled</th><th>Actions</th></tr></thead>
        <tbody>
          {courses.map(course => (
            <tr key={course.id}>
              <td>{course.id}</td>
              <td>{course.name}</td>
              <td>{course.teacher}</td>
              <td>{course.time}</td>
              <td>{course.spots}</td>
              <td>
                <button onClick={() => editCourse(course)}>Edit</button>
                <button className="danger" onClick={() => deleteCourse(course.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminEnrollments({ token }) {
  const [users, setUsers] = React.useState([])
  const [courses, setCourses] = React.useState([])
  const [rows, setRows] = React.useState([])
  const [userId, setUserId] = React.useState('')
  const [courseId, setCourseId] = React.useState('')
  const [grade, setGrade] = React.useState('')
  const [message, setMessage] = React.useState('')

  const loadAll = React.useCallback(function loadAll() {
    fetch('/api/admin/users', { headers: authHeader(token) }).then(r => r.json()).then(data => setUsers(data))
    fetch('/api/admin/courses', { headers: authHeader(token) }).then(r => r.json()).then(data => setCourses(data))
    fetch('/api/admin/enrollments', { headers: authHeader(token) }).then(r => r.json()).then(data => setRows(data))
  }, [token])

  React.useEffect(() => { loadAll() }, [loadAll])

  function addEnrollment(e) {
    e.preventDefault()
    fetch('/api/admin/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ user_id: Number(userId), course_id: Number(courseId), grade: grade === '' ? null : Number(grade) }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setMessage(data.error)
        else {
          setRows(data)
          setGrade('')
          setMessage('Enrollment added.')
        }
      })
  }

  function editEnrollment(row) {
    const newGrade = prompt('Grade:', row.grade === null ? '' : row.grade)
    if (newGrade === null) return

    fetch('/api/admin/enrollments/' + row.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ grade: newGrade === '' ? null : Number(newGrade) }),
    })
      .then(r => r.json())
      .then(data => setRows(data))
  }

  function deleteEnrollment(id) {
    if (!confirm('Delete this enrollment?')) return
    fetch('/api/admin/enrollments/' + id, {
      method: 'DELETE',
      headers: authHeader(token),
    })
      .then(r => r.json())
      .then(data => setRows(data))
  }

  return (
    <div className="box">
      <h2>Admin: Enrollments</h2>
      {message && <p className="message">{message}</p>}
      <form className="admin-form" onSubmit={addEnrollment}>
        <label>
          Student
          <select value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">Choose student</option>
            {users.filter(u => u.role === 'student').map(user => (
              <option key={user.id} value={user.id}>{user.display_name}</option>
            ))}
          </select>
        </label>
        <label>
          Course
          <select value={courseId} onChange={e => setCourseId(e.target.value)}>
            <option value="">Choose course</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
        </label>
        <TextInput label="Grade" value={grade} onChange={setGrade} type="number" />
        <button>Add Enrollment</button>
      </form>

      <table>
        <thead><tr><th>ID</th><th>Student</th><th>Course</th><th>Grade</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.student_name}</td>
              <td>{row.course_name}</td>
              <td>{row.grade === null ? 'No grade' : row.grade}</td>
              <td>
                <button onClick={() => editEnrollment(row)}>Edit Grade</button>
                <button className="danger" onClick={() => deleteEnrollment(row.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminPage({ user, token }) {
  const [page, setPage] = React.useState('users')

  return (
    <div>
      <h1>Welcome {user.name}!</h1>
      <p className="helper">Simple admin area for creating, reading, updating, and deleting school data.</p>
      <div className="tabs">
        <button className={page === 'users' ? 'active' : ''} onClick={() => setPage('users')}>Users</button>
        <button className={page === 'courses' ? 'active' : ''} onClick={() => setPage('courses')}>Courses</button>
        <button className={page === 'enrollments' ? 'active' : ''} onClick={() => setPage('enrollments')}>Enrollments</button>
      </div>
      {page === 'users' && <AdminUsers token={token} />}
      {page === 'courses' && <AdminCourses token={token} />}
      {page === 'enrollments' && <AdminEnrollments token={token} />}
    </div>
  )
}

function TeacherPage({ user, token }) {
  const [courses, setCourses] = React.useState([])
  const [selectedCourseId, setSelectedCourseId] = React.useState(null)
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    fetch('/api/teacher/courses', { headers: authHeader(token) })
      .then(r => r.json())
      .then(data => {
        setCourses(data)
        setSelectedCourseId(oldId => oldId || data[0]?.id || null)
      })
  }, [token])

  const selectedCourse = courses.find(course => course.id === selectedCourseId) || courses[0]

  function editGrade(student) {
    const currentGrade = student.grade === null ? '' : student.grade
    const newGrade = prompt('Grade:', currentGrade)
    if (newGrade === null) return

    let grade = null
    if (newGrade.trim() !== '') {
      grade = Number(newGrade)
      if (Number.isNaN(grade) || grade < 0 || grade > 100) {
        setMessage('Grade must be a number from 0 to 100.')
        return
      }
    }

    fetch('/api/teacher/courses/' + selectedCourse.id + '/students/' + student.student_id + '/grade', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ grade }),
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(result => {
        if (!result.ok) {
          setMessage(result.data.error || 'Could not update grade.')
        } else {
          setCourses(currentCourses => currentCourses.map(course =>
            course.id === result.data.id ? result.data : course))
          setMessage('Grade updated.')
        }
      })
  }

  return (
    <div>
      <h1>Welcome {user.name}!</h1>
      <CourseTable title="Your Courses" courses={courses} showAdd={false} />
      {message && <p className="message">{message}</p>}

      {courses.length > 0 && (
        <div className="tabs">
          {courses.map(course => (
            <button
              key={course.id}
              className={selectedCourse?.id === course.id ? 'active' : ''}
              onClick={() => setSelectedCourseId(course.id)}
            >
              {course.name}
            </button>
          ))}
        </div>
      )}

      {selectedCourse && (
        <div className="box">
          <h2>{selectedCourse.name} Roster</h2>
          <p className="helper">Click Edit Grade to update a student's grade.</p>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Username</th>
                <th>Grade</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedCourse.students.length === 0 && (
                <tr><td colSpan="4">No students enrolled yet.</td></tr>
              )}
              {selectedCourse.students.map(student => (
                <tr key={student.enrollment_id}>
                  <td>{student.student_name}</td>
                  <td>{student.username}</td>
                  <td>{student.grade === null ? 'No grade' : student.grade}</td>
                  <td><button onClick={() => editGrade(student)}>Edit Grade</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function App() {
  const { user, token, login, logout } = useAuth()

  if (!user) {
    return (
      <div className="page">
        <Login onLogin={login} />
      </div>
    )
  }

  return (
    <div className="page">
      <header>
        <div>
          <h2>ACME University</h2>
          <p>Student Enrollment Web App</p>
        </div>
        <button onClick={logout}>Sign out</button>
      </header>

      <main>
        {user.role === 'student' && <StudentPage user={user} token={token} />}
        {user.role === 'admin' && <AdminPage user={user} token={token} />}
        {user.role === 'teacher' && <TeacherPage user={user} token={token} />}
      </main>
    </div>
  )
}

export default App
