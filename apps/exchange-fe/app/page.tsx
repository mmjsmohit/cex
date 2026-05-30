import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
export default function Home() {
  return (
    <div>
      <section className="max-h-screen overflow-hidden border-b-2">
        <div className="flex flex-col items-center gap-12 pt-6 px-10 bg-gray-50">
          <div className="flex flex-col gap-6">
            <p className="text-5xl font-bold">
              Finance for the <span className="text-red-500">underdogs</span>.
            </p>
            <p className="text-center font-medium text-gray-600">
              Your brokerage, your exchange, your money. <br />
              Trade, borrow, spend, and earn <br />
              in the most powerful margin account in finance.
            </p>

            <Field orientation="horizontal" className="max-w-2xl">
              <Input type="search" placeholder="Enter your email" />
              <Button>Submit</Button>
            </Field>
          </div>
          <Image
            className="rounded-md shadow-lg "
            src={
              "https://backpack.exchange/new-home/marketing-hero-spot-light.png"
            }
            height={"720"}
            width={"1080"}
            alt="Backpack demo image"
          />
        </div>
      </section>
    </div>
  );
}
