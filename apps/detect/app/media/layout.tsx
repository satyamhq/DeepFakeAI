import Navigation from "../components/navigation/Navigation"

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Navigation>
      <main className="grow flex flex-col justify-start items-center gap-5 p-4 md:p-6">{children}</main>
    </Navigation>
  )
}
