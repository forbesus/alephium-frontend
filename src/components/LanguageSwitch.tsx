/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import i18next from 'i18next'
import { useEffect } from 'react'
import styled from 'styled-components'

import Menu from '@/components/Menu'
import { SelectListItem } from '@/components/Select'
import useStateWithLocalStorage from '@/hooks/useStateWithLocalStorage'

interface LanguageSwitchProps {
  className?: string
}

type Language = 'en-US' | 'fr-FR'

const languageOptions: SelectListItem<Language>[] = [
  { label: 'English', value: 'en-US' },
  { label: 'Français', value: 'fr-FR' }
]

const LanguageSwitch: React.FC<LanguageSwitchProps> = ({ className }) => {
  const [langValue, setLangValue] = useStateWithLocalStorage<string>('lang', 'en-US')

  useEffect(() => {
    i18next.changeLanguage(langValue)
  }, [langValue])

  const items = languageOptions.map((lang) => ({
    text: lang.label,
    onClick: () => setLangValue(lang.value)
  }))

  return <Menu aria-label="Lang" label={langValue} items={items} direction="up" className={className} />
}

export default styled(LanguageSwitch)``
