import Link from "next/link";
export default function NotFound() {
  return <main className="page"><h1>Niet gevonden</h1><p>Deze pagina of student bestaat niet.</p>
    <Link href="/">Terug naar het portaal</Link></main>;
}
