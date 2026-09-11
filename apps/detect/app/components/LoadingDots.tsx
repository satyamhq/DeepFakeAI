import styles from "./loading-dots.module.css"

const LoadingDots = ({ color = "#000", style = "small" }: { color?: string; style?: string }) => {
  return (
    <div className={`${style == "small" ? styles.loading2 : styles.loading} mx-auto`}>
      <span style={{ backgroundColor: color }} />
      <span style={{ backgroundColor: color }} />
      <span style={{ backgroundColor: color }} />
    </div>
  )
}

export default LoadingDots
