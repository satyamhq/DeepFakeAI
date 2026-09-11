import Navigation from "./components/navigation/Navigation"
import NotableDeepfakes from "./components/NotableDeepfakes"
import QueryPageTabs from "./QueryPageTabs"

export default function QueryPage({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <Navigation contentRight={<NotableDeepfakes count={5} />}>
        <main className="grow mx-auto px-5">
          <div className="my-5 md:my-10">
            <h1 className="text-4xl font-bold">Verify Authenticity</h1>
            <div>Analyze social media for manipulation</div>
          </div>
          <QueryPageTabs />
          {children && <div className="flex flex-col items-center gap-6 mb-10">{children}</div>}
          <div className="grid grid-cols-1 mb-4 xl:hidden">
            <NotableDeepfakes count={5} />
          </div>
        </main>
      </Navigation>
    </>
  )
}
