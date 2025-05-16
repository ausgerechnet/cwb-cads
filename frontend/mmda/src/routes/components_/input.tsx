import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { SelectMulti } from '@cads/shared/components/select-multi'
import { InputGrowable } from '@cads/shared/components/input-growable'
import { LabelBox } from '@cads/shared/components/label-box'
import { Input } from '@cads/shared/components/ui/input'
import { InputRange } from '@cads/shared/components/input-range'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'

import { Block } from './-block'

export const Route = createFileRoute('/components_/input')({
  component: InputComponents,
})

function InputComponents() {
  const [multiSelectValue, setMultiSelectValue] = useState<number[]>([])
  const [range, setRange] = useState<[number, number]>([10, 25])

  return (
    <>
      <Block componentTag="SelectMulti">
        <SelectMulti
          items={[
            { id: 0, name: 'Aaron Aaronson' },
            { id: 1, name: 'Berta Beispiel' },
            { id: 2, name: 'Charlie Chaplin' },
            { id: 3, name: 'Dora Datensatz' },
            { id: 4, name: 'Emil Einfalt' },
            { id: 5, name: 'Frieda Falsch' },
          ]}
          itemIds={multiSelectValue}
          onChange={setMultiSelectValue}
        />
      </Block>

      <Block componentName="InputGrowable" componentTag="InputGrowable">
        <div>
          <InputGrowable
            className="bg-background text-foreground"
            defaultValue="Test"
          />

          <br />

          <InputGrowable
            className="bg-background text-foreground"
            defaultValue=":-)"
          />
        </div>
      </Block>

      <Block componentName="LabelBox" componentTag="LabelBox">
        <div className="flex gap-3">
          <LabelBox labelText="Label Text" autoId>
            <Input defaultValue="Lorem ipsum dolor sit amet" />
          </LabelBox>

          <LabelBox labelText="Label Text" autoId>
            <Input defaultValue="Lorem ipsum dolor sit amet" />
          </LabelBox>

          <LabelBox labelText="Label Text" htmlFor="input-id">
            <Input defaultValue="Lorem ipsum dolor sit amet" id="input-id" />
          </LabelBox>

          <LabelBox labelText="A Select Input" autoId>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a person" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  <SelectItem value="adam">Aaron Aaronson</SelectItem>
                  <SelectItem value="berta">Berta Beispiel</SelectItem>
                  <SelectItem value="charlie">Charlie Chaplin</SelectItem>
                  <SelectItem value="dora">Dora Datensatz</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </LabelBox>
        </div>
      </Block>

      <Block componentTag="InputRange">
        <InputRange min={-50} max={1_000} value={range} onChange={setRange} />
      </Block>
    </>
  )
}
