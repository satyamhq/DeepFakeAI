export default function ErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-auto" role="alert">
      <strong className="font-bold">{title}</strong>&nbsp;
      <span className="block sm:inline">{message}</span>
    </div>
  )
}
