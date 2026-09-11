export default function MediaError({ action, errors }: { action: string; errors: string[] }) {
  return (
    <div className="flex flex-col text-center">
      <div className="text-2xl text-red-500 mt-5">Error</div>
      <div className="text-3xl mt-6 mb-6">No results</div>
      <div className="text-gray-500">Unable to {action} due to one or more errors:</div>
      {errors.map((msg, ii) => (
        <div className="text-gray-500" key={ii}>
          {msg}
        </div>
      ))}
    </div>
  )
}
