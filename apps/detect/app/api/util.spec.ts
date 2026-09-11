import { fixAudioFileName } from "./util"

const filename = "ybGR5TLo5_0dTny67xevXLgv0qU.dat"

it("test known content-type", async () => {
  expect(fixAudioFileName(filename, "audio/mp4")).toEqual("ybGR5TLo5_0dTny67xevXLgv0qU.m4a")
})

it("test unknown content-type", async () => {
  expect(fixAudioFileName(filename, "audio/unknown")).toEqual("ybGR5TLo5_0dTny67xevXLgv0qU.wav")
})

it("test missing content-type", async () => {
  expect(fixAudioFileName(filename, null)).toEqual("ybGR5TLo5_0dTny67xevXLgv0qU.wav")
})
