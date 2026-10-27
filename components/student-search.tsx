export function StudentSearch({ value = "" }: { value?: string }) {
  return <form action="/teacher/students" method="get" className="narrow-form">
    <label htmlFor="student-search">Student zoeken</label>
    <input id="student-search" name="q" defaultValue={value} />
    <button type="submit">Zoeken</button>
  </form>;
}
