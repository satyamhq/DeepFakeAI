import { CustomFlowbiteTheme } from "flowbite-react"

export const trueTheme: CustomFlowbiteTheme = {
  button: {
    color: {
      lime: "bg-lime-500 hover:bg-lime-600 text-slate-800",
    },
  },
  textInput: {
    field: {
      input: {
        colors: {
          green: "bg-brand-green-500 hover:bg-brand-green-600 text-white focus:border-lime-500 focus:ring-lime-500",
          gray: "bg-gray-700 border-gray-600 text-white focus:border-lime-500 focus:ring-lime-500 placeholder-gray-400",
          edited:
            "bg-gray-500 border-gray-600 text-white focus:border-lime-500 focus:ring-lime-500 placeholder-gray-400",
        },
      },
    },
  },
  label: {
    root: {
      colors: {
        default: "text-white",
      },
    },
  },
  tabs: {
    tabpanel: "pb-3 border-t-0",
    tablist: {
      tabitem: {
        styles: {
          fullWidth: {
            base: "ml-0 first:ml-0 w-full rounded-none flex focus:border-lime-500 focus:ring-lime-500 focus:ring-2 first:rounded-tl-lg last:rounded-tr-lg border border-gray-700 border-b-0 drop-shadow-none",
            active: {
              on: "bg-white hover:text-gray-700 hover:bg-gray-50 dark:text-gray-100 dark:hover:text-white hover:dark:bg-gray-600 dark:bg-gray-800",
              off: "p-4 text-gray-900 bg-gray-100 active dark:bg-gray-700 hover:dark:bg-gray-600 dark:text-gray-400",
            },
          },
        },
      },
    },
  },
  card: {
    root: {
      children: "flex h-full flex-col justify-top gap-4 p-6",
    },
  },
  datepicker: {
    popup: {
      root: {
        inner: "inline-block rounded-lg bg-white p-4 shadow-lg dark:bg-gray-600",
      },
    },
  },
  modal: {
    content: {
      inner: "relative flex max-h-[90dvh] flex-col rounded-lg bg-white shadow dark:bg-gray-800",
    },
  },
  toggleSwitch: {
    toggle: {
      base: "relative rounded-full border after:absolute after:rounded-full after:bg-white after:transition-all group-focus:ring-4 group-focus:ring-cyan-500/25",
    },
  },
}
